const readCSV = require('../../src/csvReader');

test('Read CSV File', async () => {
    const data = await readCSV('./enrollment.csv');
    const data1 = await readCSV('./student.csv');
    expect(data1.length).toBeGreaterThan(0);
    expect(data1.length).toBe(4);
    expect(data1[0].name).toBe('John');
    expect(data1[0].age).toBe('30'); //ignore the string type here, we will fix this later
});