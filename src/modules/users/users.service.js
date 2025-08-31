const bcrypt = require('bcrypt');
const { UsersRepository } = require('./users.repository');
const jwt  = require('jsonwebtoken');
const ApiError = require('../../utils/ApiError');
const { HeadquarterUserRepository } = require('../headquarters/headquarterUser.repository');


// UsersService contains business logic for user operations.
// It interacts with UsersRepository for database actions and handles password hashing.
  const UsersService = {
    // Returns a list of all users
    list: () => UsersRepository.list(),

    get: (email) => UsersRepository.findByEmail(email),

    create: async (data) => {
      const hashed = await bcrypt.hash(data.password, 10);

      // Crear usuario SIN idHeadquarter
      const user = await UsersRepository.create({ 
        email: data.email,
        name: data.name,
        status: data.status,
        password: hashed
      });

      // Crear relación en HeadquarterUser
      if (data.idHeadquarter) {
        await HeadquarterUserRepository.create(
          user.email, 
          parseInt(data.idHeadquarter)
        );
      }

      return user;
    },
  

  // Updates user data by email; hashes password if provided
  update: async (email, data) => {
    if (data.password) {
      const hashed = await bcrypt.hash(data.password, 10);
      return UsersRepository.updatePassword(email, hashed);
    }
    return UsersRepository.update(email, data);
  },

  // Updates only the user's status
  updateStatus: (email, status) =>
    UsersRepository.update(email, { status }),

  // Updates only the user's password, hashes before saving
  updatePassword: async (email, password) => {
    const hashed = await bcrypt.hash(password, 10);
    return UsersRepository.updatePassword(email, hashed);
  },

  // Deletes a user by email
  delete: (email) => UsersRepository.remove(email),

  login: async (email, password, windowName) => {
  if (!email || !password) throw ApiError.badRequest('email y password requeridos');

  const user = await UsersRepository.findAuthWithRoles(email);

   if (user.status !== 'active') {
    throw ApiError.forbidden('El usuario está inactivo, contacte al administrador');
  }

  if (!user) throw ApiError.unauthorized('Credenciales inválidas');

  // Verificar contraseña
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw ApiError.unauthorized('Credenciales inválidas');

  // Validar que tenga rol
  if (!user.roles || user.roles.length === 0) {
    throw ApiError.forbidden('El usuario no tiene roles asignados');
  }

  // Filtrar roles activos
  const activeRoles = user.roles.filter(ur => ur.role.status === 'active');
  if (activeRoles.length === 0) {
    throw ApiError.forbidden('El rol del usuario está inactivo');
  }

  // Verificar acceso a la ventana
  let hasAccess = false;
  for (const ur of activeRoles) {
    for (const rw of ur.role.windows) {
      if (
        rw.window.windowName === windowName &&
        rw.window.status === 'active' &&
        rw.read === 1
      ) {
        hasAccess = true;
        break;
      }
    }
  }

  if (!hasAccess) {
    throw ApiError.forbidden('El usuario no tiene permisos de lectura o la página está inactiva');
  }

  // devolver sin hash
  const { name, status } = user;
  await UsersRepository.createLoginAccess(user.email);
  return { email: user.email, name, status };
  
},



};

module.exports = { UsersService };
