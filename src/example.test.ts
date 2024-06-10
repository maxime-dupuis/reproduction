import { Entity, EntityRepository, Loaded, MikroORM, PrimaryKey, Property } from '@mikro-orm/sqlite';

@Entity()
class User {

  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @Property({ unique: true })
  email: string;

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }

}

let orm: MikroORM;
let repository: EntityRepository<User>

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [User],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

beforeEach(async () => {
  repository = orm.em.getRepository(User)
  const user = repository.create({ name: 'Toto', email: 'toto@toto.com' })
  await orm.em.persistAndFlush([user])
  orm.em.clear()
})

test('partially loaded entity should only have the loaded fields', async () => {
      const repository = orm.em.getRepository(User)
      const user: Loaded<User, never, 'id' | 'name', never> = await repository.findOneOrFail({name: 'Toto'},{
        fields: ['id', 'name'],
      });

      expect(user.id).toBeDefined(); // OK
      expect(user.name).toBeDefined(); // OK

      expect('doesntExistEvenInFullyLoadedEntities' in user).toBeFalsy(); // OK
      
      // Misleading
      expect('email' in user).toBeTruthy(); // Should be falsy
      expect(Object.hasOwn(user, 'email')).toBeTruthy(); // Should be falsy
  
      // These work!
      // But give Typescript error: Property 'email' does not exist on type 'Loaded<User, never, "name" | "id", never>'.ts(2339)
      // Not really user-friendly but we could workaround and ignore them with @ts-expect-error
      // @ts-expect-error
      expect(user.email).toBeUndefined(); // OK
      // @ts-expect-error
      expect(user.email === undefined).toBeTruthy(); // OK
      // @ts-expect-error
      expect(typeof user.email === 'undefined').toBeTruthy(); // OK
});
