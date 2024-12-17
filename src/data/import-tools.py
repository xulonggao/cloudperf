import ipaddress
import csv
import argparse
import hashlib
import os
import json
import copy
import iso3166

def ip_range_to_cidr(start_ip, end_ip):
    start = ipaddress.IPv4Address(start_ip)
    end = ipaddress.IPv4Address(end_ip)

    subnet = ipaddress.ip_network(f'{start}/{32}', strict=False)
    subnets = []

    while subnet.broadcast_address <= end:
        subnet_mask = subnet.prefixlen
        subnets.append(str(subnet))

        if subnet.broadcast_address == end:
            break

        subnet = ipaddress.ip_network(f'{subnet.broadcast_address + 1}/{32}', strict=False)

    return subnets

def get_files(path:str, ext:str = ''):
    file_list = []
    for root, dirs, files in os.walk(path):
        for file in files:
            if ext != '':
                _, extension = os.path.splitext(file)
                if ext != extension:
                    continue
            file_list.append(os.path.join(root, file))
        for dir in dirs:
            file_list += get_files(os.path.join(root, dir), ext)
    return file_list

# 这里为了高效计算出city id，以asn，国家，城市为唯一标识，md5后，取前四个字节，转换为32位的无符号整数用于id
def get_cityid(asn:int, country_code:str, city:str):
    key = str(asn) + country_code.upper() + city.lower()
    return int(hashlib.md5(key.encode('UTF-8')).hexdigest()[0:8],16)

def build_sql(alltable:dict):
    output = ''
    for i, (table, data) in enumerate(alltable.items()):
        for j, (key, value) in enumerate(data.items()):
            keys = '`' + '`,`'.join(value.keys()) + '`'
            dupkeys = ','.join(str(x)+'=VALUES('+str(x)+')' for x in value.keys())
            values = str(list(value.values()))[1:-1]
            output += f'INSERT INTO `{table}`({keys}) VALUES({values}) ON DUPLICATE KEY UPDATE {dupkeys};\n'
    return output

def parse_file(filename:str, alltable:dict):
    update_cache = {}
    with open(filename, 'r', encoding='utf-8-sig') as file:
        # 创建一个CSV阅读器对象
        reader = csv.DictReader(file)
        support_formats = {
            'countryfile': ['Country', 'ASN', 'ISP Name', 'Type\xa0ISP', 'Number of IPs'],
            'rangefile': ['start_ip', 'end_ip', 'city', 'latitude', 'longitude', 'region', 'country', 'country_name', 'continent', 'continent_name', 'asn', 'as_name', 'as_domain']
        }
        '''
            表数据获取来源：
            从数据结构看出，需要先处理rangefile数据，再处理countryfile数据。
            表处理顺序：
                rangefile -> country,city -> (city表数据处理)iprange，这里city_id是会影响后续的录入，所以考虑city_id不是自增而是使用asn+国家+城市唯一生成，这样数据可以直接处理，不用和数据库交互
                countryfile -> (country表数据处理)asn
            `country`(`code`,`name`,`continent_code`,`continent_name`) 
                code：rangefile.country
                name：rangefile.country_name
                continent_code：rangefile.continent
                continent_name：rangefile.continent_name
            `asn`(`asn`,`country_code`,`type`,`ipcounts`,`name`,`domain`)
                asn：countryfile.asn
                country_code：需要找到rangefile表中对应countryfile.Country对应的Countrycode
                type：countryfile.Type\xa0ISP
                ipcounts：countryfile.Number of IPs
                name：需要找到rangefile表中对应asn+countrycode的对应的as_name
                domain：需要找到rangefile表中对应asn+countrycode的对应的as_domain
                两表需要通过：rangefile.country_name = countryfile.Country 进行关联
            `city`(`id`,`asn`,`country_code`,`name`,`region`,`latitude`,`longitude`)
                id：通过 rangefile.asn + rangefile.country + rangefile.city 唯一生成
                asn：rangefile.asn
                country_code：rangefile.country
                name：rangefile.city
                region：rangefile.region
                latitude：rangefile.latitude
                longitude：rangefile.longitude
            `iprange`(`id`,`start_ip`,`end_ip`,`city_id`)
                id：自动生成
                start_ip：rangefile.start_ip
                end_up：rangefile.end_ip
                city_id：上表引用（通过 rangefile.asn + rangefile.country + rangefile.city 唯一标识）
        '''
        select_format = ''
        for item in support_formats:
            if set(support_formats[item]) == set(reader.fieldnames):
                select_format = item
                break
        if select_format == '':
            print(f'Not support file {filename} with columns:{reader.fieldnames}')
            exit(1)
        print(f'# Parse file {filename} \n#   format: {select_format}, columns: {support_formats[select_format]}\n')

        if select_format == 'rangefile':
            skipasn = 0
            for row in reader:
                if not row['asn'].upper().startswith('AS'):
                    #print('# Skip unknown asn line:', row)
                    skipasn+=1
                    continue
                row['asnno'] = int(row['asn'][2:])
                # country表处理
                if row['country'] not in alltable['country']:
                    if 'country' not in update_cache:
                        update_cache['country'] = {}
                    update_cache['country'][row['country']] = {
                        'code': row['country'].upper(),
                        'name': row['country_name'].replace("'", ''),
                        'continent_code': row['continent'],
                        'continent_name': row['continent_name'].replace("'", '')
                    }
                # city表处理
                cityid = get_cityid(row['asnno'], row['country'], row['city'])
                if str(cityid) not in alltable['city']:
                    if 'city' not in update_cache:
                        update_cache['city'] = {}
                    update_cache['city'][str(cityid)] = {
                            'id': cityid,
                            'asn': row['asnno'],
                            'country_code': row['country'].upper(),
                            'name': row['city'].replace("'", ''),
                            'region': row['region'].replace("'", ''),
                            'latitude': float(row['latitude']) if row['latitude'] != '' else 0.0,
                            'longitude': float(row['longitude']) if row['longitude'] != '' else 0.0
                    }
                # iprange表处理
                if row['start_ip'] not in alltable['iprange']:
                    if 'iprange' not in update_cache:
                        update_cache['iprange'] = {}
                    update_cache['iprange'][row['start_ip']] = {
                        'start_ip': ipaddress.IPv4Address(row['start_ip'])._ip,
                        'end_ip': ipaddress.IPv4Address(row['end_ip'])._ip,
                        'city_id': cityid,
                    }
            print(f'# Total skip empty asn lines:{skipasn}\n')
        elif select_format == 'countryfile':
            for row in reader:
                if not row['ASN'].upper().startswith('AS'):
                    #print('# Skip unknown asn line:', row)
                    skipasn+=1
                    continue
                row['asnno'] = int(row['ASN'][2:])
                # asn表处理
                if str(row['asnno']) not in alltable['asn']:
                    if 'asn' not in update_cache:
                        update_cache['asn'] = {}
                    country_code = ''
                    # https://zh.wikipedia.org/wiki/ISO_3166-1
                    hard_code_mapping = {
                        'Aland Islands': 'AX', 'Brunei': 'BN', 'Democratic Republic of the Congo': 'CD',
                        'Iran': 'IR', 'Ivory Coast': 'CI', 'Laos': 'LA', 'Moldova': 'MD',
                        'Palestinian Territory': 'PS', 'Republic of the Congo': 'CG', 'Reunion': 'RE', 'Russia': 'RU',
                        'South Korea': 'KR', 'Syria': 'SY', 'Taiwan': 'TW', 'Tanzania': 'TZ', 'Turkey': 'TR',
                        'United Kingdom': 'GB', 'Vatican': 'VA', 'Vietnam': 'VN',
                    }
                    if row['Country'] in hard_code_mapping:
                        country_code = hard_code_mapping[row['Country']]
                    elif row['Country'].upper() in iso3166.countries_by_name:
                        country_code = iso3166.countries_by_name[row['Country'].upper()].alpha2
                    else:
                        print(f'# Warning: can not found country code in iso3166 {row}\n')
                        exit(1)
                        #for _, (key, value) in enumerate(alltable['country'].items()):
                        #    if value['name'] == row['Country']:
                        #        country_code = value['code']
                        #        break
                    update_cache['asn'][str(row['asnno'])] = {
                        'asn': row['asnno'],
                        'country_code': country_code,
                        'type': row['Type\xa0ISP'],
                        'ipcounts': int(row['Number of IPs'].replace(',', '').replace(' ','')),
                        'name': row['ISP Name'].replace("'", ''),
                        'domain': '',
                    }
    return update_cache

parser = argparse.ArgumentParser()
parser.description="Data Import Tools All in One"
parser.add_argument("-f", "--file", help="Specify input file or input directory(e.g. countryfile.csv or ./alldata/)", type=str, required=True)
parser.add_argument("-r", "--refresh", action="store_true", help="Refresh historical data and update differences", default=False)
args = parser.parse_args()

settings_file = 'settings.json'

files = []
if os.path.isdir(args.file):
    files = get_files(args.file, '.csv')
elif os.path.isfile(args.file):
    files.append(args.file)
else:
    print(f'can not open file: {args.file}')

# 默认会读取 settings.json 做已录入数据的缓存，如果想完全不要，直接删除settings.json就好
global_cache = {
    'country': {},
    'city': {},
    'iprange': {},
    'asn': {}
}
try:
    with open(settings_file, 'r') as f:
        global_oldcache = json.load(f)
except:
    global_oldcache = copy.deepcopy(global_cache)

if not args.refresh:
    global_cache = global_oldcache

output = ''
for file in files:
    update_cache = parse_file(file, global_cache)
    output += build_sql(update_cache)
    for i, (table, data) in enumerate(update_cache.items()):
        for j, (key, value) in enumerate(data.items()):
            #print(f'update table {table} key {key} to {value}')
            global_cache[table][key] = value

if args.refresh:
    update_cache = {}
    print('# Analysis history data\n')
    # 注意，这里没有判断新数据里不存在，但是原始数据里存在的情况
    for i, (table, data) in enumerate(global_cache.items()):
        for j, (key, value) in enumerate(data.items()):
            if key not in global_oldcache[table] or global_oldcache[table][key] != global_cache[table][key]:
                #if key in global_oldcache[table]:
                #    print(f'{table} {key} {value} {global_oldcache[table][key]}\n')
                #else:
                #    print(f'{table} {key} {value}\n')
                if table not in update_cache:
                    update_cache[table] = {}
                update_cache[table][key] = value
                # 因为有可能只扫描了个别文件，因此这里应该要把旧缓存整个进行同步，才不会丢失数据
                global_oldcache[table][key] = value
    output = build_sql(update_cache)

with open(settings_file, 'w') as f:
    json.dump(global_oldcache, f)

print(output)
