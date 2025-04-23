import { useState, useEffect, useContext } from 'react';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import LogoutIcon from '@mui/icons-material/Logout';
import BuildIcon from '@mui/icons-material/Build';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { ThemeContext } from '../App';

const drawerWidth = 240;

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    height: '40px',
    minHeight: '40px',
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        '& .MuiDrawer-paper': {
            position: 'relative',
            whiteSpace: 'nowrap',
            width: drawerWidth,
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
            boxSizing: 'border-box',
            ...(!open && {
                overflowX: 'hidden',
                transition: theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
                width: theme.spacing(7),
                [theme.breakpoints.up('sm')]: {
                    width: theme.spacing(9),
                },
            }),
        },
    }),
);

const menuItems = [
    { text: 'IP Search', path: '/ipsearch', icon: <SearchIcon /> },
    { text: 'ASN Search', path: '/asnsearch', icon: <StorageIcon /> },
    { text: 'Network Performance', path: '/search', icon: <NetworkCheckIcon /> },
    { text: 'City Sets', path: '/cityset', icon: <GroupWorkIcon /> },
    { text: 'Maintenance', path: '/maintenance', icon: <BuildIcon /> },
    { text: 'System Status', path: '/status', icon: <AssessmentIcon /> },
];

export default function Layout() {
    const [open, setOpen] = useState(true);
    const [status, setStatus] = useState(null);
    const [authLevel, setAuthLevel] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [dialogError, setDialogError] = useState('');
    const [username, setUsername] = useState('');
    const { currentTheme, setCurrentTheme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleThemeChange = (event) => {
        setCurrentTheme(event.target.value);
    };

    useEffect(() => {
        // Skip token check for login page
        if (location.pathname === '/login') {
            return;
        }

        // Check for token existence and validity
        const tokenCookie = document.cookie.split('; ').find(row => row.startsWith('cp_token='));
        if (!tokenCookie) {
            navigate('/login');
            return;
        }

        // Get token from cookie
        const tokenData = tokenCookie.split('=')[1].split('|');
        if (!tokenData) {
            document.cookie = 'cp_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
            navigate('/login');
            return;
        }
        setUsername(tokenData[1]);
        setAuthLevel(parseInt(tokenData[2]));

    }, [location, navigate]);

    const handleLogout = () => {
        document.cookie = 'cp_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        navigate('/login');
    };

    const toggleDrawer = () => {
        setOpen(!open);
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="absolute" open={open}>
                <Toolbar
                    sx={{
                        pr: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '40px !important',
                        height: '40px',
                        padding: '0 24px !important'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            edge="start"
                            color="inherit"
                            aria-label="open drawer"
                            onClick={toggleDrawer}
                            sx={{
                                marginRight: '36px',
                                ...(open && { display: 'none' }),
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography
                            component="h1"
                            variant="body1"
                            sx={{
                                color: 'white',
                                fontSize: '1rem'
                            }}
                            noWrap
                        >
                            CloudPerf Dashboard
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <Typography
                                sx={{ cursor: username && username.includes('@') ? 'default' : 'pointer', color: 'white' }}
                                onClick={() => username && !username.includes('@') && setDialogOpen(true)}
                            >
                                {username}
                            </Typography>
                            {username && !username.includes('@') && (
                                <Button
                                    onClick={handleLogout}
                                    startIcon={<LogoutIcon />}
                                    size="small"
                                    sx={{
                                        padding: '2px 8px',
                                        minWidth: 'auto',
                                        color: 'white',
                                        '&:hover': {
                                            borderColor: 'rgba(255, 255, 255, 0.87)',
                                        },
                                    }}
                                >
                                </Button>
                            )}
                        </Box>
                        <Select
                            value={currentTheme}
                            onChange={handleThemeChange}
                            size="small"
                            sx={{
                                color: 'white',
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.87)' },
                                '.MuiSvgIcon-root': { color: 'white' }
                            }}
                        >
                            <MenuItem value="black">
                                <Box sx={{ width: 20, height: 20, bgcolor: '#212121', borderRadius: 1, border: '2px solid white' }} />
                            </MenuItem>
                            <MenuItem value="blue">
                                <Box sx={{ width: 20, height: 20, bgcolor: '#1976d2', borderRadius: 1, border: '2px solid white' }} />
                            </MenuItem>
                            <MenuItem value="orange">
                                <Box sx={{ width: 20, height: 20, bgcolor: '#ff9800', borderRadius: 1, border: '2px solid white' }} />
                            </MenuItem>
                            <MenuItem value="green">
                                <Box sx={{ width: 20, height: 20, bgcolor: '#4caf50', borderRadius: 1, border: '2px solid white' }} />
                            </MenuItem>
                        </Select>
                    </Box>
                </Toolbar>
            </AppBar>
            <Drawer variant="permanent" open={open}>
                <Toolbar
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        px: [1],
                        minHeight: '40px !important',
                        height: '40px'
                    }}
                >
                    <IconButton onClick={toggleDrawer}>
                        <ChevronLeftIcon />
                    </IconButton>
                </Toolbar>
                <Divider />
                <List component="nav">
                    {menuItems.map((item) => {
                        // Filter menu items based on auth level
                        const isBaseUserMenu = item.path === '/ipsearch' || item.path === '/asnsearch' || item.path === '/search';
                        const isReadonlyMenu = item.path === '/status' || item.path === '/cityset';
                        const isOtherMenu = !isBaseUserMenu && !isReadonlyMenu;

                        const shouldShow =
                            (isBaseUserMenu && (authLevel & 1)) ||
                            (isReadonlyMenu && (authLevel & 2)) ||
                            (isOtherMenu && (authLevel & 4));

                        if (!shouldShow) return null;

                        return (
                            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                                <ListItemButton
                                    component={Link}
                                    to={item.path}
                                    selected={location.pathname === item.path}
                                    sx={{
                                        minHeight: 48,
                                        justifyContent: open ? 'initial' : 'center',
                                        px: 2.5,
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: open ? 3 : 'auto',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0 }} />
                                </ListItemButton>
                            </ListItem>
                        )
                    })}
                </List>
            </Drawer>
            <Box
                component="main"
                sx={{
                    backgroundColor: (theme) =>
                        theme.palette.mode === 'light'
                            ? theme.palette.grey[100]
                            : theme.palette.grey[900],
                    flexGrow: 1,
                    height: '100vh',
                    overflow: 'auto',
                    pt: 8,
                }}
            >
                <Outlet />
            </Box>
            <Dialog open={dialogOpen} onClose={() => {
                setDialogOpen(false);
                setPassword('');
                setDialogError('');
            }}>
                <DialogTitle>Change Password</DialogTitle>
                <DialogContent>
                    {dialogError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {dialogError}
                        </Alert>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            autoFocus
                            label="New Password"
                            type="password"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <TextField
                            label="Confirm Password"
                            type="password"
                            fullWidth
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            error={confirmPassword !== '' && password !== confirmPassword}
                            helperText={confirmPassword !== '' && password !== confirmPassword ? "Passwords don't match" : ''}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setDialogOpen(false);
                        setPassword('');
                        setConfirmPassword('');
                        setDialogError('');
                    }}>Cancel</Button>
                    <Button
                        onClick={async () => {
                            try {
                                const response = await fetch('/api/changepasswd', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ password }),
                                });

                                if (!response.ok) {
                                    const error = await response.text();
                                    throw new Error(error || `Failed to change password`);
                                }
                                setDialogOpen(false);
                                setPassword('');
                                setConfirmPassword('');
                                setDialogError('');
                            } catch (error) {
                                setDialogError(error.message);
                            }
                        }}
                        disabled={!password || !confirmPassword || password !== confirmPassword}
                    >
                        Change Password
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
