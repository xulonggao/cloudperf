import { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Grid, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { executeSQL, getRedisValue, setRedisValue, deleteRedisKey } from '../services/api';

export default function Maintenance() {
    const [sql, setSql] = useState('');
    const [sqlResult, setSqlResult] = useState(null);
    const [redisKey, setRedisKey] = useState('');
    const [redisValue, setRedisValue] = useState('');
    const [redisKeys, setRedisKeys] = useState([]);
    const [editingKey, setEditingKey] = useState(null);

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
            setRedisKeys(Array.isArray(data) ? data : [{ key: redisKey, value: data }]);
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

    const handleRedisEdit = async (key) => {
        if (editingKey === key) {
            try {
                await setRedisValue(key, redisValue);
                setRedisKeys(redisKeys.map(k =>
                    k.key === key ? { ...k, value: redisValue } : k
                ));
                setEditingKey(null);
            } catch (error) {
                console.error('Error updating Redis value:', error);
            }
        } else {
            setEditingKey(key);
            setRedisValue(redisKeys.find(k => k.key === key)?.value || '');
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
                                    setRedisValue('');
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
                                    onChange={(e) => setRedisValue(e.target.value)}
                                    sx={{ mb: 1 }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={async () => {
                                        try {
                                            await setRedisValue(redisKey, redisValue);
                                            setRedisKeys([...redisKeys, { key: redisKey, value: redisValue }]);
                                            setEditingKey(null);
                                            setRedisKey('');
                                            setRedisValue('');
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
                                        setRedisValue('');
                                    }}
                                >
                                    取消
                                </Button>
                            </Box>
                        )}
                        <List>
                            {redisKeys.map((item) => (
                                <ListItem
                                    key={item.key}
                                    secondaryAction={
                                        <>
                                            <IconButton
                                                edge="end"
                                                aria-label="edit"
                                                onClick={() => handleRedisEdit(item.key)}
                                                sx={{ mr: 1 }}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                edge="end"
                                                aria-label="delete"
                                                onClick={() => handleRedisDelete(item.key)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </>
                                    }
                                >
                                    <ListItemText
                                        primary={item.key}
                                        secondary={
                                            editingKey === item.key ? (
                                                <TextField
                                                    fullWidth
                                                    value={redisValue}
                                                    onChange={(e) => setRedisValue(e.target.value)}
                                                    variant="standard"
                                                />
                                            ) : (
                                                item.value
                                            )
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
