import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const HEADER_HEIGHT = 78;

const navItems = [
  { label: "Historia", href: "#historia" },
  { label: "Soluciones", href: "#soluciones" },
  { label: "Impacto", href: "#impacto" },
  { label: "Partners", href: "#partners" },
  { label: "Contacto", href: "#contacto" },
];

const SectionTitle = styled(Typography)(({ theme }) => ({
  letterSpacing: "0.28rem",
  fontWeight: 700,
  color: theme.palette.primary.main,
  textTransform: "uppercase",
}));

const SectionWrapper = styled("section")(({ theme }) => ({
  paddingBlock: theme.spacing(10),
  backgroundColor: "transparent",
}));

const ServiceCard = styled(Paper)(({ theme }) => ({
  background: "#152534",
  borderRadius: 20,
  padding: theme.spacing(4),
  boxShadow: "0 18px 40px rgba(3,35,52,0.32)",
  border: "1px solid rgba(15,176,199,0.2)",
}));

const MetricsCard = styled(Box)(({ theme }) => ({
  background: "rgba(15,176,199,0.08)",
  borderRadius: 18,
  padding: theme.spacing(4),
  textAlign: "center",
  border: "1px solid rgba(15,176,199,0.22)",
}));

const CardsGrid = styled("div")(({ theme }) => ({
  display: "grid",
  gap: theme.spacing(4),
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
}));

const MetricsGrid = styled("div")(({ theme }) => ({
  display: "grid",
  gap: theme.spacing(4),
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
}));

const PartnersGrid = styled("div")(({ theme }) => ({
  display: "grid",
  gap: theme.spacing(4),
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  opacity: 0.88,
  alignItems: "stretch",
}));

const FooterGrid = styled("div")(({ theme }) => ({
  display: "grid",
  gap: theme.spacing(4),
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
}));

const HeroContainer = styled("section")(({ theme }) => ({
  paddingTop: theme.spacing(16),
  paddingBottom: theme.spacing(12),
  background:
    "radial-gradient(circle at 20% 10%, rgba(15,176,199,0.22), transparent 55%), radial-gradient(circle at 85% 15%, rgba(15,176,199,0.16), transparent 45%)",
}));

export const LandingPage = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const toggleMobileNav = () => {
    setMobileOpen((prev) => !prev);
  };

  const closeMobileNav = () => setMobileOpen(false);

  const renderNavButtons = (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      sx={{ display: { xs: "none", md: "flex" } }}
    >
      {navItems.map((item) => (
        <Button
          key={item.href}
          component="a"
          href={item.href}
          color="inherit"
          sx={{
            fontWeight: 600,
            letterSpacing: "0.08em",
          }}
        >
          {item.label.toUpperCase()}
        </Button>
      ))}
      <Button
        variant="contained"
        color="primary"
        component="a"
        href="#contacto"
        sx={{ fontWeight: 600 }}
      >
        HABLA CON NOSOTROS
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ backgroundColor: "#0D1820", color: "#F5FAFF", minHeight: "100vh" }}>
      <Box
        component="header"
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: HEADER_HEIGHT,
          zIndex: (theme) => theme.zIndex.appBar,
          backgroundColor: "rgba(8, 18, 24, 0.92)",
          borderBottom: "1px solid rgba(15,176,199,0.12)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, rgba(15,176,199,0.92), rgba(17,70,96,0.92))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              FRT
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} letterSpacing="0.08em">
                FLOWING RIVERS TECH
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
                SOLUCIONES CORPORATIVAS
              </Typography>
            </Box>
          </Stack>

          {renderNavButtons}

          <IconButton
            color="inherit"
            onClick={toggleMobileNav}
            sx={{ display: { xs: "flex", md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        </Container>
      </Box>

      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={closeMobileNav}
        PaperProps={{
          sx: {
            backgroundColor: "#10202C",
            color: "#F5FAFF",
            width: 260,
            pt: 2,
          },
        }}
        sx={{ display: { xs: "block", md: "none" } }}
      >
        <Stack direction="row" justifyContent="flex-end" sx={{ px: 2 }}>
          <IconButton color="inherit" onClick={closeMobileNav}>
            <MenuIcon />
          </IconButton>
        </Stack>
        <Divider sx={{ borderColor: "rgba(15,176,199,0.2)", mb: 1 }} />
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.href}
              component="a"
              href={item.href}
              onClick={closeMobileNav}
            >
              <ListItemText
                primaryTypographyProps={{
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                }}
                primary={item.label.toUpperCase()}
              />
            </ListItemButton>
          ))}
          <ListItemButton component="a" href="#contacto" onClick={closeMobileNav}>
            <ListItemText
              primaryTypographyProps={{
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "primary.main",
              }}
              primary="HABLA CON NOSOTROS"
            />
          </ListItemButton>
        </List>
      </Drawer>

      <Box component="main" sx={{ pt: `${HEADER_HEIGHT}px` }}>
        <HeroContainer id="inicio">
          <Container
            maxWidth="lg"
            sx={{
              display: "flex",
              alignItems: "center",
              minHeight: { xs: "60vh", md: "72vh" },
            }}
          >
            <Stack spacing={4} sx={{ maxWidth: 640 }}>
              <Typography
                variant="overline"
                sx={{ letterSpacing: "0.36rem", color: "primary.main" }}
              >
                INNOVACION CON PROPOSITO
              </Typography>
              <Typography
                variant="h2"
                fontWeight={700}
                sx={{ fontSize: { xs: "2.6rem", md: "3.6rem" }, lineHeight: 1.15 }}
              >
                Soluciones inteligentes para un futuro confiable
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 520 }}>
                Integramos tecnologia avanzada, experiencia y vision estrategica para impulsar
                la transformacion digital de organizaciones comprometidas con resultados de alto impacto.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  href="#contacto"
                >
                  Agenda una demo
                </Button>
                <Button variant="outlined" color="primary" size="large" href="#soluciones">
                  Conoce nuestras soluciones
                </Button>
              </Stack>
            </Stack>
          </Container>
        </HeroContainer>

        <SectionWrapper id="historia">
          <Container maxWidth="lg">
            <SectionTitle variant="overline">Nuestra historia</SectionTitle>
            <Typography variant="h3" fontWeight={600} sx={{ mt: 2 }}>
              15 anos construyendo un ecosistema tecnologico confiable
            </Typography>
            <Typography variant="body1" sx={{ mt: 3, maxWidth: 720, color: "text.secondary" }}>
              Nacimos con la conviccion de que la tecnologia debe adaptarse a las personas.
              Desde nuestros inicios acompanamos a empresas de alto impacto en su camino hacia la
              digitalizacion, combinando consultoria estrategica, desarrollo de software robusto
              y una cultura centrada en la innovacion continua.
            </Typography>
          </Container>
        </SectionWrapper>

        <SectionWrapper id="soluciones">
          <Container maxWidth="lg">
            <SectionTitle variant="overline">Soluciones</SectionTitle>
            <Typography variant="h3" fontWeight={600} sx={{ mt: 2, mb: 6 }}>
              Servicios disenados para acelerar tus resultados
            </Typography>
            <CardsGrid>
              {[
                {
                  title: "Arquitectura Cloud",
                  description:
                    "Diseno, migracion y operacion de plataformas cloud seguras y escalables con enfoque DevSecOps.",
                },
                {
                  title: "Integracion Inteligente",
                  description:
                    "Automatizamos procesos criticos conectando sistemas legados, ERPs y soluciones SaaS.",
                },
                {
                  title: "Analytics y IA",
                  description:
                    "Modelos predictivos, procesamiento de datos y analitica avanzada para decisiones con impacto.",
                },
              ].map((service) => (
                <ServiceCard elevation={0} key={service.title}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    {service.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {service.description}
                  </Typography>
                </ServiceCard>
              ))}
            </CardsGrid>
          </Container>
        </SectionWrapper>

        <SectionWrapper id="impacto">
          <Container maxWidth="lg">
            <SectionTitle variant="overline">Impacto</SectionTitle>
            <Typography variant="h3" fontWeight={600} sx={{ mt: 2, mb: 6 }}>
              Hitos que respaldan nuestra experiencia
            </Typography>
            <MetricsGrid>
              {[
                { label: "Proyectos criticos", value: "+120" },
                { label: "Paises con despliegues", value: "7" },
                { label: "Disponibilidad promedio", value: "99.95%" },
                { label: "Clientes activos", value: "45" },
              ].map((metric) => (
                <MetricsCard key={metric.label}>
                  <Typography variant="h3" fontWeight={700} color="primary.main">
                    {metric.value}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mt: 1, color: "text.secondary" }}>
                    {metric.label}
                  </Typography>
                </MetricsCard>
              ))}
            </MetricsGrid>
          </Container>
        </SectionWrapper>

        <SectionWrapper id="partners">
          <Container maxWidth="lg">
            <SectionTitle variant="overline">Partners</SectionTitle>
            <Typography variant="h3" fontWeight={600} sx={{ mt: 2, mb: 6 }}>
              Aliados que potencian nuestro ecosistema
            </Typography>
            <PartnersGrid>
              {["Azure", "AWS", "Google Cloud", "Databricks"].map((partner) => (
                <Paper
                  key={partner}
                  sx={{
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 14,
                    padding: 3,
                    textAlign: "center",
                    border: "1px solid rgba(15,176,199,0.2)",
                  }}
                  elevation={0}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    {partner}
                  </Typography>
                </Paper>
              ))}
            </PartnersGrid>
          </Container>
        </SectionWrapper>

        <SectionWrapper id="contacto">
          <Container maxWidth="md">
            <SectionTitle variant="overline">Contacto</SectionTitle>
            <Typography variant="h3" fontWeight={600} sx={{ mt: 2, mb: 4 }}>
              Conversemos sobre tu proximo desafio tecnologico
            </Typography>
            <Paper
              sx={{
                background: "#132330",
                borderRadius: 20,
                padding: { xs: 3, md: 5 },
                boxShadow: "0 18px 40px rgba(5,25,38,0.45)",
              }}
              elevation={0}
            >
              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 2, md: 3 },
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                }}
              >
                <TextField label="Nombre" fullWidth variant="outlined" />
                <TextField label="Email corporativo" fullWidth variant="outlined" />
                <TextField
                  label="Mensaje"
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  sx={{ gridColumn: { md: "1 / -1" } }}
                />
                <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                  >
                    Enviar consulta
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Container>
        </SectionWrapper>
      </Box>

      <Box component="footer" sx={{ background: "#091119", py: 6, mt: 10 }}>
        <Container maxWidth="lg">
          <FooterGrid>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Flowing Rivers Technologies
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
                Innovacion, resiliencia e impacto medible a traves de tecnologia confiable.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Contacto
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                contacto@flowingrivers.tech
              </Typography>
              <Typography variant="body2">+506 5550 1122</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Siguenos
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                LinkedIn / Twitter / YouTube
              </Typography>
            </Box>
          </FooterGrid>
          <Typography variant="caption" sx={{ display: "block", mt: 4, color: "text.secondary" }}>
            Copyright {currentYear} Flowing Rivers Technologies. Todos los derechos reservados.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};
