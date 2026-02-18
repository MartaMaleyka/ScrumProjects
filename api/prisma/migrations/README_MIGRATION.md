# Migración: Agregar GlobalRole a User

## Descripción
Esta migración agrega el enum `GlobalRole` y el campo `globalRole` al modelo `User` para implementar RBAC básico.

## Pasos para aplicar la migración

1. **Generar la migración:**
   ```bash
   cd api
   npx prisma migrate dev --name add_global_role
   ```

2. **Actualizar usuarios existentes:**
   Por defecto, todos los usuarios existentes tendrán `globalRole = USER`.
   
   Para asignar roles específicos a usuarios existentes, ejecuta:
   ```sql
   -- Ejemplo: Asignar ADMIN a un usuario específico
   UPDATE users SET global_role = 'ADMIN' WHERE email = 'admin@example.com';
   
   -- Ejemplo: Asignar MANAGER a varios usuarios
   UPDATE users SET global_role = 'MANAGER' WHERE id IN (1, 2, 3);
   ```

3. **Verificar la migración:**
   ```bash
   npx prisma migrate status
   ```

## Valores del enum GlobalRole
- `ADMIN`: Acceso total al sistema
- `MANAGER`: Puede crear proyectos y gestionar miembros
- `USER`: Solo puede ver proyectos donde es miembro (default)

## Notas
- El campo `globalRole` tiene un valor por defecto de `USER`
- Se agregó un índice en `globalRole` para mejorar el rendimiento de las consultas
- La migración es compatible con datos existentes (no rompe nada)

