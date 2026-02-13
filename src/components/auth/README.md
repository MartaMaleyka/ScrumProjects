# Componentes de Autenticación Modernos

## ModernLogin.tsx

Componente de login moderno y responsivo siguiendo la guía UX/UI del IMHPA.

### Características

- **Diseño responsivo**: Mobile-first con centrado vertical
- **Paleta de colores institucional**: 
  - Azul Mar: `#0264C5`
  - Azul Claro: `#11C0F1`
  - Amarillo: `#FF9100`
- **Accesibilidad**: Labels visibles, focus rings, contraste mínimo 4.5:1
- **Validación**: Email/username y contraseña con mensajes claros
- **Microinteracciones**: Hover, focus y transiciones suaves

### Uso

```tsx
import ModernLoginWrapper from './auth/ModernLoginWrapper';

// En tu página Astro
<ModernLoginWrapper client:load />
```

### Estructura

- **Fondo**: Gradiente desde `#0264C5` hasta `#11C0F1`
- **Caja central**: 
  - `max-width: 400px`
  - Fondo: `bg-white/90`
  - Bordes: `rounded-2xl`
  - Sombra: `shadow-2xl`
- **Logo**: IMHPA centrado superior
- **Título**: "Bienvenido" en azul institucional
- **Campos**: Email/username y contraseña con validación
- **Botón**: Gradiente azul con hover effect

### Accesibilidad

- Labels asociados correctamente (`htmlFor`)
- Estados de error anunciados (`aria-describedby`)
- Focus management para navegación por teclado
- Contraste optimizado para legibilidad

### Tipografía

- Fuente principal: Inter
- Fuente alternativa: Poppins
- Pesos: 300 (texto), 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

## ModernLoginWrapper.tsx

Wrapper que integra el componente de login con el sistema de autenticación existente.

### Funcionalidades

- Manejo de estados de autenticación
- Redirección automática post-login
- Loading states
- Integración con `useAuth` hook

## Aplicación

Para ver el componente en acción:
1. Visitar `http://localhost:4321/login-moderno`
2. El sistema verificará automáticamente si ya estás autenticado
3. Si no, mostrará el formulario de login moderno

### URLs de prueba:

- **Login moderno**: `/login-moderno`
- **Home**: `/home` (requiere autenticación)
