export default async function run(name: string, runnable: () => Promise<void>) {
    console.log(`${name}`);
    const t0 = performance.now();
    await runnable();
    const t1 = performance.now();
    console.log(`took ${t1 - t0} milliseconds.`);
    console.log('----')
};