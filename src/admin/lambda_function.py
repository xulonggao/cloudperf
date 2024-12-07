import json
import data_layer

def init_database():
    ret = {"status":404, "msg":"sql not found"}
    with open('./init.sql', 'r') as file:
        sql_script = file.read()
        if mysql_runsql(sql_script):
            ret = {"status":200, "msg":"init database finish."}
        else:
            ret["msg"] = "run sql error."
    return ret

def lambda_handler(event, context):
    ret = {"status":404, "msg":"not found"}
    action = event['action']
    try:
        func = getattr(globals(), action)
        func(event)
    except AttributeError:
        print("Invalid command {action}")
    return ret
