import { useState } from "react";

const INITIAL_FORM = {
    nombreCompleto: '',
    correo: '',
    telefono: '',
    cargo: '',
    familiaCargo: '',
    cvArchivo: ''
};

export default function PostulacionForm() {
    const [formData, setFormData] = useState(INITIAL_FORM);

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        
        setFormData(prevState => ({
            ...prevState,
            [name]: type === 'file' ? files[0] : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.nombreCompleto.trim() || !formData.correo.trim()){
            alert("PONTE LAS PILAS AWEONAO");
            return;
        }

        console.log("Formulario enviado", formData);

    };

    return (
        <div>
            <h1>Formulario de Postulación</h1>
            
            <form onSubmit={handleSubmit}>
                
                <div style={{ marginBottom: '10px' }}>
                    
                    <label htmlFor="nombreCompleto">Nombre del candidato:</label>
                    <input 
                        id="nombreCompleto" 
                        name="nombreCompleto" 
                        type="text" 
                        value={formData.nombreCompleto} 
                        placeholder="Nombre completo" 
                        onChange={handleChange} 
                    />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="correo">Correo del candidato:</label>
                    <input 
                        id="correo" 
                        name="correo" 
                        type="email" 
                        value={formData.correo} 
                        placeholder="Ej: test@test.com" 
                        onChange={handleChange} 
                    />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="telefono">Teléfono:</label>
                    <input 
                        id="telefono" 
                        name="telefono" 
                        type="tel" 
                        value={formData.telefono} 
                        placeholder="Ej: +56 9 1234 5678" 
                        onChange={handleChange} 
                    />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="cargo">Cargo a postular:</label>
                    <input 
                        id="cargo" 
                        name="cargo" 
                        type="text" 
                        value={formData.cargo} 
                        placeholder="Ej: Desarrollador Frontend" 
                        onChange={handleChange} 
                    />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="familiaCargo">Familia del cargo:</label>
                    <select 
                        id="familiaCargo" 
                        name="familiaCargo" 
                        value={formData.familiaCargo} 
                        onChange={handleChange}
                    >
                        <option value="">Selecciona un área...</option>
                        <option value="tecnologia">Tecnología / TI</option>
                        <option value="finanzas">Finanzas</option>
                        <option value="rrhh">Recursos Humanos</option>
                        <option value="ventas">Ventas</option>
                    </select>
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="cvArchivo">Sube tu CV:</label>
                    <input 
                        id="cvArchivo" 
                        name="cvArchivo" 
                        type="file" 
                        accept=".pdf,.doc,.docx" 
                        onChange={handleChange} 
                    />
                </div>

                <button type="submit" style={{ marginTop: '15px' }}>
                    Enviar Postulación
                </button>
            </form>
        </div>
    );
}