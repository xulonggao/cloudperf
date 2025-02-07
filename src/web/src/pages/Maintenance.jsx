import { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Grid, List, ListItem, ListItemText, IconButton, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { executeSQL, getRedisValue, setRedisValue, deleteRedisKey } from '../services/api';

export default function Maintenance() {
    const [sql, setSql] = useState('');
    const [sqlResult, setSqlResult] = useState(null);
    const [redisKey, setRedisKey] = useState('');
    const [redisValue, setRedisVal] = useState('');
    const [redisKeys, setRedisKeys] = useState([]);
    const [editingKey, setEditingKey] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [userRole, setUserRole] = useState('1');

    const handleSqlExecute = async () => {
        try {
            const data = await executeSQL(sql);
            setSqlResult(data);
        } catch (error) {
            console.error('Error executing SQL:', error);
            setSqlResult({ error: 'Failed to execute SQL' });
        }
    };

    const handleRedisSearch = async () => {
        try {
            const data = await getRedisValue(redisKey);
            // If data is an array, it's a list of keys. Otherwise, it's a single key's data
            setRedisKeys(Array.isArray(data)
                ? data.map(key => ({ key, value: key }))
                : [{ key: redisKey, value: data }]
            );
        } catch (error) {
            console.error('Error searching Redis:', error);
        }
    };

    const handleRedisDelete = async (key) => {
        try {
            await deleteRedisKey(key);
            setRedisKeys(redisKeys.filter(k => k.key !== key));
        } catch (error) {
            console.error('Error deleting Redis key:', error);
        }
    };

    const handleUpdateUser = async () => {
        try {
            const response = await fetch('/api/updateuser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    role: parseInt(userRole)
                })
            });
            if (response.ok) {
                setUsername('');
                setPassword('');
                setUserRole('1');
                alert('用户更新成功');
            } else {
                alert('更新失败: ' + await response.text());
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('更新失败');
        }
    };

    const handleRedisEdit = async (key) => {
        if (editingKey === key) {
            try {
                // For string type, JSON encode the value before saving
                await setRedisValue(key, JSON.stringify(redisValue));
                const data = await getRedisValue(key);
                setRedisKeys(redisKeys.map(k =>
                    k.key === key ? { ...k, value: data } : k
                ));
                setEditingKey(null);
            } catch (error) {
                console.error('Error updating Redis value:', error);
            }
        } else {
            setEditingKey(key);
            const currentValue = redisKeys.find(k => k.key === key)?.value;
            // For string type, JSON decode the value for editing
            try {
                setRedisVal(JSON.parse(currentValue.value));
            } catch (error) {
                // If parsing fails, use the raw value
                setRedisVal(currentValue.value);
            }
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            数据库管理
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            variant="outlined"
                            label="SQL语句"
                            value={sql}
                            onChange={(e) => setSql(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleSqlExecute}
                            sx={{ mb: 2 }}
                        >
                            执行
                        </Button>
                        {sqlResult && (
                            <Paper sx={{ p: 2, mt: 2, maxHeight: 400, overflow: 'auto' }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    执行结果:
                                </Typography>
                                <pre>
                                    {JSON.stringify(sqlResult, null, 2)}
                                </pre>
                            </Paper>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Redis管理
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                label="键"
                                value={redisKey}
                                onChange={(e) => setRedisKey(e.target.value)}
                            />
                            <Button
                                variant="contained"
                                onClick={handleRedisSearch}
                                sx={{ mr: 1 }}
                            >
                                查询
                            </Button>
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={() => {
                                    setEditingKey('new');
                                    setRedisVal('');
                                }}
                            >
                                新建
                            </Button>
                        </Box>
                        {editingKey === 'new' && (
                            <Box sx={{ mt: 2, mb: 2 }}>
                                <TextField
                                    fullWidth
                                    label="键"
                                    value={redisKey}
                                    onChange={(e) => setRedisKey(e.target.value)}
                                    sx={{ mb: 1 }}
                                />
                                <TextField
                                    fullWidth
                                    label="值"
                                    value={redisValue}
                                    onChange={(e) => setRedisVal(e.target.value)}
                                    sx={{ mb: 1 }}
                                />
                                <Box>
                                    <Button
                                        variant="contained"
                                        onClick={async () => {
                                            try {
                                                await setRedisValue(redisKey, redisValue);
                                                const data = await getRedisValue(redisKey);
                                                setRedisKeys([...redisKeys, { key: redisKey, value: data }]);
                                                setEditingKey(null);
                                                setRedisKey('');
                                                setRedisVal('');
                                            } catch (error) {
                                                console.error('Error creating Redis key:', error);
                                            }
                                        }}
                                        sx={{ mr: 1 }}
                                    >
                                        保存
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setEditingKey(null);
                                            setRedisKey('');
                                            setRedisVal('');
                                        }}
                                    >
                                        取消
                                    </Button>
                                </Box>
                            </Box>
                        )}
                        <List>
                            {redisKeys.map((item) => (
                                <ListItem
                                    key={item.key}
                                    secondaryAction={
                                        <>
                                            {item.value.type == 'string' && (
                                                <IconButton
                                                    edge="end"
                                                    aria-label="edit"
                                                    onClick={() => handleRedisEdit(item.key)}
                                                    sx={{ mr: 1 }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            )}
                                            {item.value.type != 'none' && (
                                                <IconButton
                                                    edge="end"
                                                    aria-label="delete"
                                                    onClick={() => handleRedisDelete(item.key)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            )}
                                        </>
                                    }
                                >
                                    <ListItemText
                                        primary={item.key}
                                        secondary={
                                            editingKey === item.key ? (
                                                <Box>
                                                    <TextField
                                                        fullWidth
                                                        value={redisValue}
                                                        onChange={(e) => setRedisVal(e.target.value)}
                                                        variant="standard"
                                                        sx={{ mb: 1 }}
                                                    />
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={async () => {
                                                            try {
                                                                await setRedisValue(item.key, redisValue);
                                                                const data = await getRedisValue(item.key);
                                                                setRedisKeys(redisKeys.map(k =>
                                                                    k.key === item.key ? { ...k, value: data } : k
                                                                ));
                                                                setEditingKey(null);
                                                            } catch (error) {
                                                                console.error('Error updating Redis value:', error);
                                                            }
                                                        }}
                                                        sx={{ mr: 1 }}
                                                    >
                                                        保存
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        onClick={() => setEditingKey(null)}
                                                    >
                                                        取消
                                                    </Button>
                                                </Box>
                                            ) : (
                                                <Box>
                                                    {item.value.type && (
                                                        <Typography variant="caption" display="block">
                                                            Type: {item.value.type} | Exists: {item.value.exists} | TTL: {item.value.ttl} | Length: {item.value.length}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="body2">
                                                        {item.value.value ? (
                                                            Array.isArray(item.value.value)
                                                                ? item.value.value.map((v, i) => (
                                                                    <span key={i}>{v}<br /></span>
                                                                ))
                                                                : item.value.value
                                                        ) : (
                                                            JSON.stringify(item.value, null, 2)
                                                        )}
                                                    </Typography>
                                                </Box>
                                            )
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            用户管理
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="用户名"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <TextField
                                fullWidth
                                label="密码"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <FormControl fullWidth>
                                <InputLabel>用户角色</InputLabel>
                                <Select
                                    value={userRole}
                                    label="用户角色"
                                    onChange={(e) => setUserRole(e.target.value)}
                                >
                                    <MenuItem value="1">基础用户 (AUTH_BASEUSER)</MenuItem>
                                    <MenuItem value="3">系统巡检 (AUTH_READONLY)</MenuItem>
                                    <MenuItem value="7">管理员 (AUTH_ADMIN)</MenuItem>
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                onClick={handleUpdateUser}
                                sx={{ mt: 1 }}
                            >
                                保存
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
