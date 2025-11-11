import { Fragment, useState } from "react";
import type { PropsWithChildren } from "react";
import { Outlet, useLocation, Link as RouterLink } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import MapIcon from "@mui/icons-material/Map";
import GroupIcon from "@mui/icons-material/Group";
import DescriptionIcon from "@mui/icons-material/Description";
import { useAuth } from "../../hooks/useAuth";
import frtLogo from "../../assets/frt-logo.png";

const drawerWidth = 260;

const navigationItems = [
  {
    label: "Catalogos",
    icon: <Inventory2Icon fontSize="small" />,
    path: "/catalogs",
  },
  {
    label: "Provincias",
    icon: <MapIcon fontSize="small" />,
    path: "/geography/provinces",
  },
  {
    label: "Cantones",
    icon: <MapIcon fontSize="small" />,
    path: "/geography/cantons",
  },
  {
    label: "Distritos",
    icon: <MapIcon fontSize="small" />,
    path: "/geography/districts",
  },
  {
    label: "Barrios",
    icon: <MapIcon fontSize="small" />,
    path: "/geography/barrios",
  },
  {
    label: "Usuarios",
    icon: <GroupIcon fontSize="small" />,
    path: "/users",
  },
  {
    label: "Documentacion API",
    icon: <DescriptionIcon fontSize="small" />,
    path: "/api-docs",
  },
];

export const AppLayout = ({ children }: PropsWithChildren) => {
  const theme = useTheme();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleNavigate = () => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Box
          component="img"
          src={frtLogo}
          alt="Flowing Rivers Technologies"
          sx={{ width: 120, mx: "auto", mb: 1.5 }}
        />
        <Typography variant="h6" fontWeight={700}>
          Catalogos FE CR
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Consola de administracion
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {navigationItems.map((item) => {
          const selected = pathname.startsWith(item.path);
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                selected={selected}
                onClick={handleNavigate}
              >
                <ListItemIcon
                  sx={{ color: selected ? theme.palette.primary.main : "inherit" }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={logout}
        >
          Cerrar sesion
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          boxShadow: "none",
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Consola administrativa
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {user?.username ?? "Administrador"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.role ?? "SIN ROL"}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              {user?.username?.[0]?.toUpperCase() ?? "A"}
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="menu"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            '& .MuiDrawer-paper': {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            '& .MuiDrawer-paper': {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          backgroundColor: "background.default",
        }}
      >
        <Toolbar />
        <Box component={Fragment}>{children ?? <Outlet />}</Box>
      </Box>
    </Box>
  );
};
