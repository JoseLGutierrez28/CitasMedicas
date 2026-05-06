# 🏥 MediCita - Sistema Web para Gestión y Agendamiento de Citas Médicas

![Versión](https://img.shields.io/badge/version-1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)
![SQLite](https://img.shields.io/badge/SQLite-3.x-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4)
![Licencia](https://img.shields.io/badge/license-MIT-green)

## 📋 Descripción del Proyecto

**MediCita** es un sistema web diseñado para optimizar la gestión y el agendamiento de citas médicas en pequeños y medianos centros de salud. La plataforma permite a los pacientes agendar, reprogramar y cancelar citas en línea, mientras que los médicos y administradores pueden gestionar agendas, visualizar estadísticas y controlar el flujo de pacientes.

Este proyecto fue desarrollado como trabajo de grado para la **Ingeniería de Sistemas de la Universidad Nacional Abierta y a Distancia (UNAD)**.

### 🎯 Objetivo General

Diseñar un sistema web para la gestión y agendamiento de citas médicas con el fin de optimizar los procesos administrativos en pequeños y medianos centros de salud.

### ✨ Características Principales

| Módulo | Funcionalidades |
|:---|:---|
| **Pacientes** | Registro, login, agendar citas, ver horarios disponibles, cancelar citas, ver historial |
| **Médicos** | Login, ver agenda diaria, gestionar estados de citas, ver listado de pacientes |
| **Administradores** | Dashboard con estadísticas, gráficos, gestión global de citas, reportes |

### 🛠️ Tecnologías Utilizadas

| Capa | Tecnología |
|:---|:---|
| **Backend** | Node.js + Express.js |
| **Base de Datos** | SQLite3 |
| **Frontend** | HTML5, TailwindCSS, JavaScript |
| **Autenticación** | Express-Session + bcryptjs |
| **Gráficos** | Chart.js |

---

## 📁 Estructura del Proyecto
sistema-citas-medicas/
│
├── views/ # Vistas HTML
│ ├── index.html # Landing page principal
│ ├── login.html # Inicio de sesión
│ ├── register.html # Registro de pacientes
│ ├── dashboard-paciente.html # Panel del paciente
│ ├── agendar-cita.html # Agendamiento de citas
│ ├── mis-citas.html # Historial de citas
│ ├── dashboard-medico.html # Panel del médico
│ └── dashboard-admin.html # Panel del administrador
│
├── public/ # Archivos estáticos
│ ├── css/
│ │ ├── styles.css # Estilos fuente Tailwind
│ │ └── tailwind.css # Tailwind compilado
│ └── js/
│
├── config/
│ └── database.js # Configuración y modelo de BD
│
├── server.js # Servidor principal
├── package.json # Dependencias
├── tailwind.config.js # Configuración de Tailwind
└── README.md # Este archivo



---

## 🚀 Instalación y Configuración

### Requisitos Previos

Asegúrate de tener instalado en tu sistema:

- **Node.js** (versión 18.x o superior) - [Descargar aquí](https://nodejs.org/)
- **npm** (viene incluido con Node.js)
- **Git** (opcional, para clonar el repositorio)

### Paso 1: Clonar el Repositorio


git clone https://github.com/JoseLGutierrez28/CitasMedicas.git
cd sistema-citas-medicas


### Paso 2: Clonar el Repositorio

npm install

### Paso 3: Iniciar el Servidor
node server.js


### 5: Acceder a la Aplicación
http://localhost:3000
