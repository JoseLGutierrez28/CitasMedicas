const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuración de sesiones
app.use(session({
    secret: 'mi-secreto-para-citas-medicas',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hora
}));

// Middleware para pasar usuario a todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ============= RUTAS PÚBLICAS =============

// Home
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const bcrypt = require('bcryptjs');

    db.get('SELECT * FROM usuarios WHERE email = ?', [email], async (err, user) => {
        if (err || !user) {
            return res.send('<script>alert("Credenciales incorrectas"); window.location="/";</script>');
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.send('<script>alert("Credenciales incorrectas"); window.location="/";</script>');
        }

        req.session.user = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol
        };

        // Redirigir según el rol
        if (user.rol === 'admin') {
            res.redirect('/admin/dashboard');
        } else if (user.rol === 'medico') {
            res.redirect('/medico/dashboard');
        } else {
            res.redirect('/paciente/dashboard');
        }
    });
});

// Registro de pacientes
app.post('/register', (req, res) => {
    const { nombre, email, password, telefono } = req.body;
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(`INSERT INTO usuarios (nombre, email, password, telefono, rol) 
            VALUES (?, ?, ?, ?, 'paciente')`,
        [nombre, email, hashedPassword, telefono],
        (err) => {
            if (err) {
                return res.send('<script>alert("Error: El email ya existe"); window.location="/register.html";</script>');
            }
            res.send('<script>alert("Registro exitoso. Ahora puedes iniciar sesión"); window.location="/";</script>');
        });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ============= RUTAS PROTEGIDAS PARA PACIENTES =============

app.get('/paciente/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'paciente') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'views', 'dashboard-paciente.html'));
});

app.get('/paciente/mis-citas', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'mis-citas.html'));
});

app.get('/paciente/agendar', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'agendar-cita.html'));
});

// API: Obtener médicos
app.get('/api/medicos', (req, res) => {
    db.all(`
        SELECT u.id, u.nombre, u.email, m.especialidad, m.consultorio
        FROM usuarios u
        JOIN medicos m ON u.id = m.usuario_id
        WHERE u.rol = 'medico'
    `, [], (err, medicos) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(medicos);
    });
});

// API: Obtener horarios disponibles de un médico
app.get('/api/horarios-disponibles/:medicoId/:fecha', (req, res) => {
    const { medicoId, fecha } = req.params;
    const diaSemana = new Date(fecha).getDay() + 1; // Domingo=7, etc

    // Obtener horario base del médico
    db.get(`
        SELECT hora_inicio, hora_fin FROM horarios_disponibles 
        WHERE medico_id = ? AND dia_semana = ?
    `, [medicoId, diaSemana], (err, horarioBase) => {
        if (err || !horarioBase) {
            return res.json([]);
        }

        // Obtener citas ya agendadas para esa fecha
        db.all(`
            SELECT hora FROM citas 
            WHERE medico_id = ? AND fecha = ? AND estado != 'cancelada'
        `, [medicoId, fecha], (err, citasOcupadas) => {
            const horasOcupadas = citasOcupadas.map(c => c.hora);

            // Generar horarios disponibles (cada 30 min)
            const horariosDisponibles = [];
            let [horaInicio, minInicio] = horarioBase.hora_inicio.split(':');
            let [horaFin, minFin] = horarioBase.hora_fin.split(':');

            let horaActual = parseInt(horaInicio);
            let minActual = parseInt(minInicio);

            while (horaActual < parseInt(horaFin) || (horaActual === parseInt(horaFin) && minActual < parseInt(minFin))) {
                const horaStr = `${horaActual.toString().padStart(2, '0')}:${minActual.toString().padStart(2, '0')}`;
                if (!horasOcupadas.includes(horaStr)) {
                    horariosDisponibles.push(horaStr);
                }

                minActual += 30;
                if (minActual >= 60) {
                    horaActual++;
                    minActual = 0;
                }
            }

            res.json(horariosDisponibles);
        });
    });
});

// API: Agendar cita
app.post('/api/agendar-cita', (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'paciente') {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { medico_id, fecha, hora, motivo } = req.body;
    const paciente_id = req.session.user.id;

    // Verificar que el horario esté disponible
    db.get(`
        SELECT * FROM citas 
        WHERE medico_id = ? AND fecha = ? AND hora = ? AND estado != 'cancelada'
    `, [medico_id, fecha, hora], (err, citaExistente) => {
        if (citaExistente) {
            return res.status(400).json({ error: 'El horario ya no está disponible' });
        }

        db.run(`
            INSERT INTO citas (paciente_id, medico_id, fecha, hora, motivo, estado)
            VALUES (?, ?, ?, ?, ?, 'agendada')
        `, [paciente_id, medico_id, fecha, hora, motivo], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, cita_id: this.lastID });
        });
    });
});

// API: Obtener citas del paciente
app.get('/api/mis-citas', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    const query = `
        SELECT c.*, u.nombre as medico_nombre, m.especialidad
        FROM citas c
        JOIN usuarios u ON c.medico_id = u.id
        JOIN medicos m ON u.id = m.usuario_id
        WHERE c.paciente_id = ?
        ORDER BY c.fecha DESC, c.hora DESC
    `;

    db.all(query, [req.session.user.id], (err, citas) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(citas);
    });
});

// API: Cancelar cita
app.post('/api/cancelar-cita/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    db.run(`UPDATE citas SET estado = 'cancelada' WHERE id = ? AND paciente_id = ?`,
        [req.params.id, req.session.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

// ============= RUTAS PROTEGIDAS PARA MÉDICOS =============

app.get('/medico/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'medico') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'views', 'dashboard-medico.html'));
});

app.get('/api/mis-pacientes', (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'medico') return res.status(401).json({ error: 'No autorizado' });

    db.all(`
        SELECT DISTINCT u.id, u.nombre, u.email, u.telefono
        FROM citas c
        JOIN usuarios u ON c.paciente_id = u.id
        WHERE c.medico_id = ?
        ORDER BY u.nombre
    `, [req.session.user.id], (err, pacientes) => {
        res.json(pacientes || []);
    });
});

app.get('/api/mis-citas-medico', (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'medico') return res.status(401).json({ error: 'No autorizado' });

    db.all(`
        SELECT c.*, u.nombre as paciente_nombre, u.telefono as paciente_telefono
        FROM citas c
        JOIN usuarios u ON c.paciente_id = u.id
        WHERE c.medico_id = ?
        ORDER BY c.fecha, c.hora
    `, [req.session.user.id], (err, citas) => {
        res.json(citas || []);
    });
});

app.post('/api/actualizar-estado-cita/:id', (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'medico') return res.status(401).json({ error: 'No autorizado' });

    const { estado } = req.body;
    db.run(`UPDATE citas SET estado = ? WHERE id = ? AND medico_id = ?`,
        [estado, req.params.id, req.session.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

// ============= RUTAS PROTEGIDAS PARA ADMIN =============

app.get('/admin/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'admin') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'views', 'dashboard-admin.html'));
});

app.get('/api/estadisticas', (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'admin') return res.status(401).json({ error: 'No autorizado' });

    db.get(`SELECT COUNT(*) as total_pacientes FROM usuarios WHERE rol = 'paciente'`, [], (err, pacientes) => {
        db.get(`SELECT COUNT(*) as total_medicos FROM usuarios WHERE rol = 'medico'`, [], (err, medicos) => {
            db.get(`SELECT COUNT(*) as total_citas FROM citas`, [], (err, citas) => {
                db.get(`SELECT COUNT(*) as citas_hoy FROM citas WHERE fecha = date('now')`, [], (err, citasHoy) => {
                    res.json({
                        pacientes: pacientes?.total_pacientes || 0,
                        medicos: medicos?.total_medicos || 0,
                        citas: citas?.total_citas || 0,
                        citasHoy: citasHoy?.citas_hoy || 0
                    });
                });
            });
        });
    });
});

app.get('/api/todas-citas', (req, res) => {
    if (!req.session.user || req.session.user.rol !== 'admin') return res.status(401).json({ error: 'No autorizado' });

    db.all(`
        SELECT c.*, 
               p.nombre as paciente_nombre, 
               m.nombre as medico_nombre,
               med.especialidad
        FROM citas c
        JOIN usuarios p ON c.paciente_id = p.id
        JOIN usuarios m ON c.medico_id = m.id
        JOIN medicos med ON m.id = med.usuario_id
        ORDER BY c.fecha DESC, c.hora DESC
    `, [], (err, citas) => {
        res.json(citas || []);
    });
});

// API para obtener datos del usuario actual
app.get('/api/user', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    res.json({
        id: req.session.user.id,
        nombre: req.session.user.nombre,
        email: req.session.user.email,
        rol: req.session.user.rol
    });
});

// ============ LLAMAR VISTAS AL DAR CLICK ============

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});


app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});