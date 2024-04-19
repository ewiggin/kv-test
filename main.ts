import run from "./run.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { ulid } from "https://deno.land/x/ulid@v0.3.0/mod.ts";

const N_USERS = 10_000;
const db = await Deno.openKv();

const [marioId, crisId] = [ulid(), ulid()];
const primaryIndex = 'test_users';
const secondaryIndex = 'test_users_by_name';

run('Performance test', async () => {
  console.log('-------------------');

  await run('Delete all users', async () => {
    for await (const entry of db.list({ prefix: [primaryIndex] })) {
      await db
        .atomic()
        .delete([secondaryIndex])
        .delete(entry.key)
        .commit();
    }
  });

  await run(`Add ${N_USERS} users`, async () => {
    for (let i = 0; i < N_USERS; i++) {
      const randomName = faker.name.findName();
      await db.set([primaryIndex, `${ulid()}`], randomName);
    }

    await db.set([primaryIndex, marioId], 'Mario Martínez')
    await db.set([primaryIndex, crisId], 'Cristina Martín')
  });

  await run(`Add ${N_USERS} users with secondary index`, async () => {

    for (let i = 0; i < N_USERS; i++) {
      const id = ulid();
      const randomName = faker.name.findName();
      await db.atomic()
        .check({ key: [primaryIndex, id], versionstamp: null })
        .set([primaryIndex, id], randomName)
        .set([secondaryIndex, randomName], randomName)
        .commit();
    }
  });

  await run('List all users', async () => {
    const users = db.list({ prefix: [primaryIndex] });
    await Array.fromAsync(users);
  });

  await run('List all users by secondary_index', async () => {
    const users = db.list({ prefix: [secondaryIndex] });
    await Array.fromAsync(users);
  });

  await run('Get 1 user by name', async () => {
    const user = await db.get([primaryIndex, marioId]);
    console.log(' - User found: ', user.value);
  });

  await run('GetMany 2 users by name', async () => {
    const users = await db.getMany([[primaryIndex, marioId], [primaryIndex, crisId]]);
    console.log(' - User found: ', users.length);
    console.log(' - First: ', users[0].value);
    console.log(' - Second: ', users[1].value);
  });


  await run('Search users named Vicky', async () => {
    const iterator = db.list<string>({ prefix: [secondaryIndex] });
    const users = await Array.fromAsync(iterator);
    const vickyUsers = users.filter((item) =>
      item.value.toLocaleLowerCase().includes('Vicky'.toLocaleLowerCase())
    );
    console.log(` - Found ${vickyUsers.length} vicky users`);
  });

  console.log('');
  console.log('finish all');

});
