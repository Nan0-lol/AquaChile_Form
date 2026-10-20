import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';
import './Dashboard.css';

// Datos simulados para el Gráfico de Anillo (Familias de Cargo)
const dataFamilias = [
  { name: 'Operaciones', value: 82, color: '#0d9488' },
  { name: 'Tecnología / TI', value: 58, color: '#0284c7' },
  { name: 'Ventas / Comercial', value: 47, color: '#3b82f6' },
  { name: 'Finanzas', value: 32, color: '#2dd4bf' },
];

// Datos simulados para el Gráfico de Barras (Flujo Mensual)
const dataMensual = [
  { mes: 'May', postulantes: 35 },
  { mes: 'Jun', postulantes: 42 },
  { mes: 'Jul', postulantes: 48 },
  { mes: 'Ago', postulantes: 53 },
  { mes: 'Sep', postulantes: 61 },
  { mes: 'Oct', postulantes: 41 },
];

const candidatosRecientes = [
  { id: 'CF', nombre: 'Camila Fuentes Rojas', email: 'camila.fuentes@gmail.com', cargo: 'Jefa de Centro de Cultivo', familia: 'Operaciones', fecha: '17 oct 2026', estado: 'Pendiente' },
  { id: 'MS', nombre: 'Matías Soto Henríquez', email: 'msoto.henriquez@outlook.com', cargo: 'Desarrollador Full Stack', familia: 'Tecnología / TI', fecha: '16 oct 2026', estado: 'En proceso' },
  { id: 'VM', nombre: 'Valentina Muñoz Carrasco', email: 'vmunoz.c@gmail.com', cargo: 'Técnico en Acuicultura', familia: 'Operaciones', fecha: '15 oct 2026', estado: 'Finalizada' }
];

const Dashboard = () => {
  return (
    <div className="dashboard-wrapper">
      
      {/* 1. BARRA DE NAVEGACIÓN SUPERIOR (NAVBAR) */}
      <header className="dashboard-navbar">
        <div className="navbar-left">
          <div className="brand-logo">
            <img src="/logo.png" alt="AquaChile Logo" className="logo-img" />
            <div className="brand-text">
              <span className="brand-title">AquaChile</span>
              <span className="brand-subtitle">HR Portal</span>
            </div>
          </div>
          
          <div className="navbar-divider"></div>
          
          <div className="breadcrumbs">
            <span className="crumb-muted">Inicio</span>
            <span className="crumb-separator">&gt;</span>
            <span className="crumb-active">Solicitudes</span>
          </div>
        </div>

        <div className="navbar-right">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Buscar en el portal..." />
          </div>

          <div className="notification-btn">
            <span>🔔</span>
            <span className="badge">3</span>
          </div>

          <div className="user-profile">
            <div className="avatar">DB</div>
            <div className="user-info">
              <span className="user-name">Diego B.</span>
              <span className="user-role">Analista RRHH</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="dashboard-content">
        <div className="dashboard-header-title">
          <h1>Panel de Reclutamiento</h1>
          <p>Seguimiento de postulaciones y procesos de selección de AquaChile.</p>
        </div>

        {/* Aquí pondremos las 4 tarjetas en el Paso 2 */}
        {/* 2.1 TARJETAS DE MÉTRICAS (KPIs) */}
        <div className="kpi-grid">
          
          {/* Tarjeta 1: Total */}
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Total Postulantes</span>
              <span className="kpi-icon">👥</span>
            </div>
            <div className="kpi-value">248</div>
            <div className="kpi-footer text-emerald">
              +12.4% <span className="kpi-muted">Últimos 6 meses</span>
            </div>
          </div>

          {/* Tarjeta 2: Pendientes */}
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Pendientes</span>
              <span className="kpi-icon alert-icon">⏱️</span>
            </div>
            <div className="kpi-value">64</div>
            <div className="kpi-footer">
              26% del total <span className="kpi-muted">CVs esperando revisión</span>
            </div>
          </div>

          {/* Tarjeta 3: En Proceso */}
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">En Proceso</span>
              <span className="kpi-icon process-icon">💬</span>
            </div>
            <div className="kpi-value">97</div>
            <div className="kpi-footer">
              39% del total <span className="kpi-muted">Entrevistas y evaluaciones</span>
            </div>
          </div>

          {/* Tarjeta 4: Finalizados */}
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Finalizados</span>
              <span className="kpi-icon success-icon">✅</span>
            </div>
            <div className="kpi-value">87</div>
            <div className="kpi-footer">
              35% del total <span className="kpi-muted">Procesos cerrados</span>
            </div>
          </div>
        </div>
        {/* 2.2 SECCIÓN DE GRÁFICOS */}
        <div className="charts-grid">
          
          {/* Gráfico 1: Anillo */}
          <div className="chart-card">
            <h3 className="chart-title">Postulaciones por Familia de Cargo</h3>
            <p className="chart-subtitle">Distribución acumulada últimos 6 meses</p>
            
            <div className="chart-container" style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataFamilias}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {dataFamilias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Leyenda del gráfico de anillo */}
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

          {/* Gráfico 2: Barras */}
          <div className="chart-card">
            <h3 className="chart-title">Flujo Mensual de Postulaciones</h3>
            <p className="chart-subtitle">Volumen de postulantes por mes, 2026</p>
            
            <div className="chart-container" style={{ height: '300px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataMensual}>
                  <XAxis dataKey="mes" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="postulantes" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
        {/* PASO 4: TABLA DE SOLICITUDES RECIENTES */}
        <div className="table-card">
          <div className="table-header">
            <div>
              <h3>Solicitudes Recientes</h3>
              <p className="chart-subtitle">Gestiona y revisa las postulaciones entrantes</p>
            </div>
            <div className="table-filters">
              <div className="status-tabs">
                <span className="tab active">Todos <span className="tab-count">11</span></span>
                <span className="tab">Pendiente <span className="tab-count">4</span></span>
                <span className="tab">En proceso <span className="tab-count">4</span></span>
                <span className="tab">Finalizada <span className="tab-count">3</span></span>
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
                {candidatosRecientes.map((cand, index) => (
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
                        <button className="btn-secondary">📄 Descargar CV</button>
                        <button className="btn-primary">👁️ Revisar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

    </div>
  );
};

export default Dashboard;