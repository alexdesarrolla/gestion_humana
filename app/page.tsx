"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/login");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-container">
          <div className="landing-header-content">
            <div className="landing-logo-section">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">GH</span>
              </div>
              <div className="landing-brand-info">
                <h1 className="landing-portal-title">Portal de Gestión Humana</h1>
                <p className="landing-company-name">Tu Empresa</p>
              </div>
            </div>
            <nav className="landing-nav-links">
              <a href="#inicio" className="landing-nav-link">Inicio</a>
              <a href="#novedades" className="landing-nav-link">Novedades</a>
              <a href="#recursos" className="landing-nav-link">Recursos</a>
              <a href="#contacto" className="landing-nav-link">Contacto</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="landing-hero">
        <div className="landing-container">
          <div className="landing-hero-content">
            <div className="landing-welcome-section">
              <h2 className="landing-hero-title">
                Bienvenido al Portal de Gestión Humana
              </h2>
              <p className="landing-hero-description">
                Tu centro de información y recursos para el desarrollo profesional y personal. 
                Mantente al día con las últimas novedades, políticas y beneficios de la empresa.
              </p>
              <div className="landing-hero-features">
                <div className="landing-feature">
                  <span className="landing-feature-icon">📋</span>
                  <span>Gestión de documentos y políticas</span>
                </div>
                <div className="landing-feature">
                  <span className="landing-feature-icon">🎯</span>
                  <span>Programas de bienestar y desarrollo</span>
                </div>
                <div className="landing-feature">
                  <span className="landing-feature-icon">📅</span>
                  <span>Cronograma de actividades y eventos</span>
                </div>
                <div className="landing-feature">
                  <span className="landing-feature-icon">🛡️</span>
                  <span>Seguridad y salud en el trabajo</span>
                </div>
              </div>
            </div>
            
            <div className="landing-login-section">
              <div className="landing-login-card">
                <h3 className="landing-login-title">Iniciar Sesión</h3>
                <form className="landing-login-form" onSubmit={handleLogin}>
                  <div className="landing-form-group">
                    <label htmlFor="email">Correo electrónico</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="tu@empresa.com"
                      required
                    />
                  </div>
                  <div className="landing-form-group">
                    <label htmlFor="password">Contraseña</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="landing-form-options">
                    <label className="landing-checkbox-label">
                      <input
                        type="checkbox"
                        name="remember"
                        checked={formData.remember}
                        onChange={handleInputChange}
                      />
                      Recordarme
                    </label>
                    <a href="#" className="landing-forgot-password">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                  <button type="submit" className="landing-login-btn">
                    Ingresar al Portal
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feed Section */}
      <section id="novedades" className="landing-feed">
        <div className="landing-container">
          <div className="landing-feed-header">
            <h2 className="landing-feed-title">Feed de Novedades</h2>
            <p className="landing-feed-subtitle">
              Mantente informado con las últimas actualizaciones, eventos y recursos disponibles para ti.
            </p>
          </div>

          {/* Featured Message */}
          <div className="landing-featured-message">
            <div className="landing-featured-content">
              <span className="landing-featured-badge">Destacado</span>
              <h3 className="landing-featured-title">
                Nueva Política de Trabajo Híbrido
              </h3>
              <p className="landing-featured-description">
                Conoce los nuevos lineamientos para el trabajo híbrido que entrarán en vigencia 
                el próximo mes. Incluye horarios flexibles, días de oficina y herramientas digitales.
              </p>
              <div className="landing-featured-meta">
                <span>📅 Publicado: 15 de Enero, 2024</span>
                <span>👤 Recursos Humanos</span>
                <span>⏱️ Lectura: 5 min</span>
              </div>
              <a href="#" className="landing-featured-cta">
                Leer más →
              </a>
            </div>
          </div>

          {/* Cards Row */}
          <div className="landing-cards-row">
            {/* Bienestar Card */}
            <div className="landing-card">
              <div className="landing-card-header">
                <span className="landing-card-category bienestar">Bienestar</span>
                <h3 className="landing-card-title">Programas de Bienestar</h3>
              </div>
              <div className="landing-blog-feed">
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-600 text-2xl">🧘</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Sesiones de Mindfulness</h4>
                    <p className="landing-post-excerpt">
                      Únete a nuestras sesiones semanales de mindfulness para reducir el estrés.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority high">Alta</span>
                      <span className="landing-post-type">Actividad</span>
                      <span>Hace 2 días</span>
                    </div>
                  </div>
                </article>
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-2xl">💪</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Gimnasio Corporativo</h4>
                    <p className="landing-post-excerpt">
                      Nuevos horarios y equipos disponibles en nuestro gimnasio.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority medium">Media</span>
                      <span className="landing-post-type">Beneficio</span>
                      <span>Hace 1 semana</span>
                    </div>
                  </div>
                </article>
              </div>
              <a href="#" className="landing-card-link">
                Ver todos los programas →
              </a>
            </div>

            {/* Actividades Card */}
            <div className="landing-card">
              <div className="landing-card-header">
                <span className="landing-card-category actividades">Actividades</span>
                <h3 className="landing-card-title">Cronograma de Actividades</h3>
              </div>
              <div className="landing-blog-feed">
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                      <span className="text-amber-600 text-2xl">🎉</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Celebración Fin de Año</h4>
                    <p className="landing-post-excerpt">
                      Únete a nuestra celebración anual con cena y actividades especiales.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority high">Alta</span>
                      <span className="landing-post-type">Evento</span>
                      <span>En 2 semanas</span>
                    </div>
                  </div>
                </article>
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 text-2xl">📚</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Taller de Liderazgo</h4>
                    <p className="landing-post-excerpt">
                      Desarrolla tus habilidades de liderazgo con nuestros expertos.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority medium">Media</span>
                      <span className="landing-post-type">Capacitación</span>
                      <span>Próximo mes</span>
                    </div>
                  </div>
                </article>
              </div>
              <a href="#" className="landing-card-link">
                Ver cronograma completo →
              </a>
            </div>
          </div>

          {/* Second Cards Row */}
          <div className="landing-cards-row">
            {/* SST Card */}
            <div className="landing-card">
              <div className="landing-card-header">
                <span className="landing-card-category sst">SST</span>
                <h3 className="landing-card-title">Seguridad y Salud en el Trabajo</h3>
              </div>
              <div className="landing-blog-feed">
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 text-2xl">🛡️</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Protocolo de Emergencias</h4>
                    <p className="landing-post-excerpt">
                      Actualización de los protocolos de evacuación y primeros auxilios.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority high">Alta</span>
                      <span className="landing-post-type">Protocolo</span>
                      <span>Hace 3 días</span>
                    </div>
                  </div>
                </article>
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 text-2xl">🏥</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Brigada de Emergencias</h4>
                    <p className="landing-post-excerpt">
                      Capacitación para nuevos miembros de la brigada de emergencias.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority medium">Media</span>
                      <span className="landing-post-type">Capacitación</span>
                      <span>Hace 1 semana</span>
                    </div>
                  </div>
                </article>
              </div>
              <a href="#" className="landing-card-link">
                Ver recursos de SST →
              </a>
            </div>

            {/* Normatividad Card */}
            <div className="landing-card">
              <div className="landing-card-header">
                <span className="landing-card-category normatividad">Normatividad</span>
                <h3 className="landing-card-title">Blog de Normatividad</h3>
              </div>
              <div className="landing-blog-feed">
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-violet-100 flex items-center justify-center">
                      <span className="text-violet-600 text-2xl">📋</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Código de Conducta 2024</h4>
                    <p className="landing-post-excerpt">
                      Nuevas actualizaciones al código de conducta empresarial.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority high">Alta</span>
                      <span className="landing-post-type">Política</span>
                      <span>Hace 1 día</span>
                    </div>
                  </div>
                </article>
                <article className="landing-blog-post">
                  <div className="landing-post-image">
                    <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 text-2xl">⚖️</span>
                    </div>
                  </div>
                  <div className="landing-post-content">
                    <h4 className="landing-post-title">Ley de Protección de Datos</h4>
                    <p className="landing-post-excerpt">
                      Guía sobre el manejo y protección de datos personales.
                    </p>
                    <div className="landing-post-meta">
                      <span className="landing-post-priority medium">Media</span>
                      <span className="landing-post-type">Normativa</span>
                      <span>Hace 5 días</span>
                    </div>
                  </div>
                </article>
              </div>
              <a href="#" className="landing-card-link">
                Ver todas las normativas →
              </a>
            </div>
          </div>

          {/* Featured Birthday Section */}
          <div className="landing-featured-birthday">
            <div className="landing-birthday-content">
              <span className="landing-birthday-badge">Esta Semana</span>
              <h3 className="landing-birthday-title">
                Cumpleañeros de la Semana
              </h3>
              <p className="landing-birthday-description">
                Celebremos juntos a nuestros compañeros que están de cumpleaños esta semana. 
                ¡Envíales tus felicitaciones!
              </p>
              <div className="landing-birthday-featured-list">
                <div className="landing-birthday-featured-person">
                  <div className="landing-birthday-avatar">
                    <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">MG</span>
                    </div>
                  </div>
                  <div className="landing-birthday-info">
                    <h4 className="landing-birthday-person-name">María González</h4>
                    <p className="landing-birthday-person-role">Gerente de Marketing</p>
                    <p className="landing-birthday-person-date">🎂 Miércoles 17 de Enero</p>
                  </div>
                </div>
                <div className="landing-birthday-featured-person">
                  <div className="landing-birthday-avatar">
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">CR</span>
                    </div>
                  </div>
                  <div className="landing-birthday-info">
                    <h4 className="landing-birthday-person-name">Carlos Rodríguez</h4>
                    <p className="landing-birthday-person-role">Desarrollador Senior</p>
                    <p className="landing-birthday-person-date">🎂 Viernes 19 de Enero</p>
                  </div>
                </div>
              </div>
              <div className="landing-birthday-actions">
                <a href="#" className="landing-birthday-cta primary">
                  Enviar Felicitaciones
                </a>
                <a href="#" className="landing-birthday-cta secondary">
                  Ver Todos los Cumpleaños
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contacto" className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-content">
            <div className="landing-footer-section">
              <div className="landing-footer-logo">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">GH</span>
                </div>
                <span>Portal de Gestión Humana</span>
              </div>
              <p className="landing-footer-description">
                Tu centro de información y recursos para el desarrollo profesional y personal. 
                Conectando a nuestro equipo con las mejores oportunidades de crecimiento.
              </p>
            </div>
            
            <div className="landing-footer-section">
              <h4>Enlaces Rápidos</h4>
              <ul className="landing-footer-links">
                <li><a href="#inicio">Inicio</a></li>
                <li><a href="#novedades">Novedades</a></li>
                <li><a href="#recursos">Recursos</a></li>
                <li><a href="#contacto">Contacto</a></li>
              </ul>
            </div>
            
            <div className="landing-footer-section">
              <h4>Recursos</h4>
              <ul className="landing-footer-links">
                <li><a href="#">Manual del Empleado</a></li>
                <li><a href="#">Políticas de la Empresa</a></li>
                <li><a href="#">Beneficios</a></li>
                <li><a href="#">Capacitaciones</a></li>
              </ul>
            </div>
            
            <div className="landing-footer-section">
              <h4>Contacto</h4>
              <div className="landing-contact-info">
                <p>📧 rh@tuempresa.com</p>
                <p>📞 +57 (1) 234-5678</p>
                <p>📍 Bogotá, Colombia</p>
                <p>🕒 Lun - Vie: 8:00 AM - 6:00 PM</p>
              </div>
            </div>
          </div>
          
          <div className="landing-footer-bottom">
            <p>© 2024 Tu Empresa. Todos los derechos reservados.</p>
            <p>Portal de Gestión Humana - Versión 1.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
