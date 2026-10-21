import React, { useState, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Clock, MessageSquare, CheckCircle, Search, Bell, FileText, Eye, Settings, LogOut, User, X } from 'lucide-react';
import './Dashboard.css';

// Datos simulados para el Gráfico de Anillo
const dataFamilias = [
  { name: 'Operaciones', value: 82, color: '#0d9488' },
  { name: 'Tecnología / TI', value: 58, color: '#0284c7' },
  { name: 'Ventas / Comercial', value: 47, color: '#3b82f6' },
  { name: 'Finanzas', value: 32, color: '#2dd4bf' },
];

// Datos simulados para el Gráfico de Barras
const dataMensual = [
  { mes: 'May', postulantes: 35 },
  { mes: 'Jun', postulantes: 42 },
  { mes: 'Jul', postulantes: 48 },
  { mes: 'Ago', postulantes: 53 },
  { mes: 'Sep', postulantes: 61 },
  { mes: 'Oct', postulantes: 41 },
];

// Datos simulados para la Tabla
const candidatosRecientes = [
  { id: 'CF', nombre: 'Camila Fuentes Rojas', email: 'camila.fuentes@gmail.com', cargo: 'Jefa de Centro de Cultivo', familia: 'Operaciones', fecha: '17 oct 2026', estado: 'Pendiente' },
  { id: 'MS', nombre: 'Matías Soto Henríquez', email: 'msoto.henriquez@outlook.com', cargo: 'Desarrollador Full Stack', familia: 'Tecnología / TI', fecha: '16 oct 2026', estado: 'En proceso' },
  { id: 'VM', nombre: 'Valentina Muñoz Carrasco', email: 'vmunoz.c@gmail.com', cargo: 'Técnico en Acuicultura', familia: 'Operaciones', fecha: '15 oct 2026', estado: 'Finalizada' }
];

const Dashboard = () => {
  // Estados de la interfaz
  // Estados de la interfaz
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [terminoBusqueda, setTerminoBusqueda] = useState(''); // NUEVO: Memoria del buscador
  
  // Referencia para deslizar la pantalla
  const tablaRef = useRef(null);

  // Memoria para el Panel Lateral (Drawer)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState(null);

  // Funciones
  const aplicarFiltroYBajar = (estado) => {
    setFiltroEstado(estado);
    if (tablaRef.current) {
      tablaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const abrirDrawer = (candidato) => {
    setCandidatoSeleccionado(candidato);
    setIsDrawerOpen(true);
  };

  const cerrarDrawer = () => {
    setIsDrawerOpen(false);
  };
  // Lógica de filtrado combinado (Estado + Buscador)
  const candidatosFiltrados = candidatosRecientes.filter(candidato => {
    // 1. Revisa si cumple con la pestaña seleccionada
    const cumpleEstado = filtroEstado === 'Todos' || candidato.estado === filtroEstado;
    
    // 2. Revisa si el nombre, cargo o familia incluye lo que escribimos (ignorando mayúsculas)
    const textoBuscado = terminoBusqueda.toLowerCase();
    const cumpleBusqueda = 
      candidato.nombre.toLowerCase().includes(textoBuscado) ||
      candidato.cargo.toLowerCase().includes(textoBuscado) ||
      candidato.familia.toLowerCase().includes(textoBuscado);

    // Muestra al candidato solo si cumple ambas condiciones
    return cumpleEstado && cumpleBusqueda;
  });

  // Contadores dinámicos
  const countTodos = candidatosRecientes.length;
  const countPendiente = candidatosRecientes.filter(c => c.estado === 'Pendiente').length;
  const countEnProceso = candidatosRecientes.filter(c => c.estado === 'En proceso').length;
  const countFinalizada = candidatosRecientes.filter(c => c.estado === 'Finalizada').length;

  return (
    <div className="dashboard-wrapper">
      
      {/* 1. BARRA DE NAVEGACIÓN SUPERIOR (NAVBAR) */}
      <header className="dashboard-navbar">
        <div className="navbar-left">
          <div className="brand-logo">
            <img src="/logo.png" alt="AquaChile Logo" className="logo-img" />
          </div>
          <div className="navbar-divider"></div>
          <div className="breadcrumbs">
            <span className="crumb-muted">Inicio</span>
            <span className="crumb-separator">&gt;</span>
            <span className="crumb-active">Solicitudes</span>
          </div>
        </div>

        <div className="navbar-right">
          {/* Contenedor relativo para que la lista flote justo debajo */}
          <div className="search-container" style={{ position: 'relative' }}>
            <div className="search-box">
              <Search className="search-icon" size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Buscar por nombre o cargo..." 
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
              />
            </div>

            {/* Menú desplegable de resultados que solo aparece si escribes algo */}
            {terminoBusqueda.length > 0 && (
              <div className="search-dropdown">
                {candidatosFiltrados.length > 0 ? (
                  candidatosFiltrados.map((cand, index) => (
                    <div 
                      key={index} 
                      className="search-result-item"
                      onClick={() => {
                        abrirDrawer(cand); // Abre el panel lateral al instante
                        setTerminoBusqueda(''); // Limpia el buscador
                      }}
                    >
                      <div className="candidate-avatar">{cand.id}</div>
                      <div>
                        <div className="candidate-name">{cand.nombre}</div>
                        <div className="candidate-email">{cand.cargo}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="search-no-results">No se encontraron candidatos</div>
                )}
              </div>
            )}
          </div>
          
          <div className="notification-btn">
            <Bell size={18} color="#cbd5e1" />
            <span className="badge">3</span>
          </div>

          <div className="profile-container" style={{ position: 'relative' }}>
            <div 
              className="user-profile" 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              style={{ cursor: 'pointer' }}
            >
              <div className="avatar">DB</div>
              <div className="user-info">
                <span className="user-name">Diego B.</span>
                <span className="user-role">Analista RRHH</span>
              </div>
            </div>

            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-name">Diego Gonzalo Barría</div>
                  <div className="dropdown-email">d.barria@aquachile.com</div>
                </div>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item">
                  <User size={16} />
                  <span>Mi Perfil</span>
                </button>
                <button className="dropdown-item">
                  <Settings size={16} />
                  <span>Configuración</span>
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout">
                  <LogOut size={16} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="dashboard-content">
        <div className="dashboard-header-title">
          <h1>Panel de Reclutamiento</h1>
          <p>Seguimiento de postulaciones y procesos de selección de AquaChile.</p>
        </div>

        {/* 2.1 TARJETAS DE MÉTRICAS (KPIs) */}
        <div className="kpi-grid">
          <div 
            className={`kpi-card ${filtroEstado === 'Todos' ? 'active-card' : ''}`}
            onClick={() => aplicarFiltroYBajar('Todos')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-header">
              <span className="kpi-title">Total Postulantes</span>
              <span className="kpi-icon"><Users size={20} color="#e2e8f0" /></span>
            </div>
            <div className="kpi-value">{countTodos}</div>
            <div className="kpi-footer text-emerald">
              +12.4% <span className="kpi-muted">Últimos 6 meses</span>
            </div>
          </div>

          <div 
            className={`kpi-card ${filtroEstado === 'Pendiente' ? 'active-card' : ''}`}
            onClick={() => aplicarFiltroYBajar('Pendiente')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-header">
              <span className="kpi-title">Pendientes</span>
              <span className="kpi-icon alert-icon"><Clock size={20} /></span>
            </div>
            <div className="kpi-value">{countPendiente}</div>
            <div className="kpi-footer">
              26% del total <span className="kpi-muted">CVs esperando revisión</span>
            </div>
          </div>

          <div 
            className={`kpi-card ${filtroEstado === 'En proceso' ? 'active-card' : ''}`}
            onClick={() => aplicarFiltroYBajar('En proceso')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-header">
              <span className="kpi-title">En Proceso</span>
              <span className="kpi-icon process-icon"><MessageSquare size={20} /></span>
            </div>
            <div className="kpi-value">{countEnProceso}</div>
            <div className="kpi-footer">
              39% del total <span className="kpi-muted">Entrevistas y evaluaciones</span>
            </div>
          </div>

          <div 
            className={`kpi-card ${filtroEstado === 'Finalizada' ? 'active-card' : ''}`}
            onClick={() => aplicarFiltroYBajar('Finalizada')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-header">
              <span className="kpi-title">Finalizados</span>
              <span className="kpi-icon success-icon"><CheckCircle size={20} /></span>
            </div>
            <div className="kpi-value">{countFinalizada}</div>
            <div className="kpi-footer">
              35% del total <span className="kpi-muted">Procesos cerrados</span>
            </div>
          </div>
        </div>

        {/* 2.2 SECCIÓN DE GRÁFICOS */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3 className="chart-title">Postulaciones por Familia de Cargo</h3>
            <p className="chart-subtitle">Distribución acumulada últimos 6 meses</p>
            <div className="chart-container" style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataFamilias} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                    {dataFamilias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              {dataFamilias.map((item, i) => (
                <div key={i} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: item.color }}></span>
                  <span className="legend-label">{item.name}</span>
                  <span className="legend-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">Flujo Mensual de Postulaciones</h3>
            <p className="chart-subtitle">Volumen de postulantes por mes, 2026</p>
            <div className="chart-container" style={{ height: '300px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataMensual}>
                  <XAxis dataKey="mes" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="postulantes" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 2.3 TABLA DE SOLICITUDES RECIENTES */}
        <div className="table-card" ref={tablaRef}>
          <div className="table-header">
            <div>
              <h3>Solicitudes Recientes</h3>
              <p className="chart-subtitle">Gestiona y revisa las postulaciones entrantes</p>
            </div>
            <div className="table-filters">
              <div className="status-tabs">
                <span className={`tab ${filtroEstado === 'Todos' ? 'active' : ''}`} onClick={() => aplicarFiltroYBajar('Todos')}>
                  Todos <span className="tab-count">{countTodos}</span>
                </span>
                <span className={`tab ${filtroEstado === 'Pendiente' ? 'active' : ''}`} onClick={() => aplicarFiltroYBajar('Pendiente')}>
                  Pendiente <span className="tab-count">{countPendiente}</span>
                </span>
                <span className={`tab ${filtroEstado === 'En proceso' ? 'active' : ''}`} onClick={() => aplicarFiltroYBajar('En proceso')}>
                  En proceso <span className="tab-count">{countEnProceso}</span>
                </span>
                <span className={`tab ${filtroEstado === 'Finalizada' ? 'active' : ''}`} onClick={() => aplicarFiltroYBajar('Finalizada')}>
                  Finalizada <span className="tab-count">{countFinalizada}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CANDIDATO</th>
                  <th>CARGO POSTULADO</th>
                  <th>FAMILIA DE CARGO</th>
                  <th>FECHA DE SOLICITUD</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {candidatosFiltrados.map((cand, index) => (
                  <tr key={index}>
                    <td>
                      <div className="candidate-cell">
                        <div className="candidate-avatar">{cand.id}</div>
                        <div>
                          <div className="candidate-name">{cand.nombre}</div>
                          <div className="candidate-email">{cand.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-text">{cand.cargo}</td>
                    <td><span className="badge-family">{cand.familia}</span></td>
                    <td className="table-text">{cand.fecha}</td>
                    <td>
                      <span className={`badge-status ${cand.estado.replace(' ', '-').toLowerCase()}`}>
                        <span className="status-dot"></span> {cand.estado}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-secondary">
                          <FileText size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} /> 
                          Descargar CV
                        </button>
                        <button className="btn-primary" onClick={() => abrirDrawer(cand)}>
                          <Eye size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} /> 
                          Revisar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 3. PANEL LATERAL (DRAWER) DE REVISIÓN */}
      <div className={`drawer-overlay ${isDrawerOpen ? 'open' : ''}`} onClick={cerrarDrawer}></div>
      
      <div className={`drawer-panel ${isDrawerOpen ? 'open' : ''}`}>
        {candidatoSeleccionado && (
          <div className="drawer-content">
            <div className="drawer-header">
              <h2>Detalle de Postulación</h2>
              <button className="close-drawer-btn" onClick={cerrarDrawer}>
                <X size={24} color="#94a3b8" />
              </button>
            </div>
            
            <div className="drawer-body">
              <div className="drawer-profile-header">
                <div className="drawer-avatar">{candidatoSeleccionado.id}</div>
                <div>
                  <h3>{candidatoSeleccionado.nombre}</h3>
                  <p>{candidatoSeleccionado.email}</p>
                </div>
              </div>

              <div className="drawer-section">
                <h4>Información del Cargo</h4>
                <div className="info-group">
                  <span className="info-label">Cargo Postulado:</span>
                  <span className="info-value">{candidatoSeleccionado.cargo}</span>
                </div>
                <div className="info-group">
                  <span className="info-label">Familia:</span>
                  <span className="badge-family">{candidatoSeleccionado.familia}</span>
                </div>
                <div className="info-group">
                  <span className="info-label">Fecha de Envío:</span>
                  <span className="info-value">{candidatoSeleccionado.fecha}</span>
                </div>
              </div>

              <div className="drawer-section">
                <h4>Cambiar Estado</h4>
                <select className="status-select" defaultValue={candidatoSeleccionado.estado}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En proceso">En proceso</option>
                  <option value="Finalizada">Finalizada</option>
                </select>
                <button className="btn-submit" style={{ marginTop: '1rem' }}>Guardar Cambios</button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;