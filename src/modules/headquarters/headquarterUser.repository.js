const prisma = require('../../lib/prisma.js');

const HeadquarterUserRepository = {
  create: (email, idHeadquarter) =>
    prisma.headquarterUser.create({
      data: {
        email: email,
        idHeadquarter: idHeadquarter
      }
    })
};

module.exports = { HeadquarterUserRepository };
