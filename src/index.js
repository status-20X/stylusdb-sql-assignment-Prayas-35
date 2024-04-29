const { parseQuery } = require('./queryParser');
const readCSV = require('./csvReader');

// async function executeSELECTQuery(query) {
//     const { fields, table, whereClauses, joinTable, joinCondition } = parseQuery(query);
//     let data = await readCSV(`${table}.csv`);
    
//     // Perform INNER JOIN if specified
//     if (joinTable && joinCondition) {
//         const joinData = await readCSV(`${joinTable}.csv`);
//         data = data.flatMap(mainRow => {
//             return joinData
//                 .filter(joinRow => {
//                     const mainValue = mainRow[joinCondition.left.split('.')[1]];
//                     const joinValue = joinRow[joinCondition.right.split('.')[1]];
//                     return mainValue === joinValue;
//                 })
//                 .map(joinRow => {
//                     return fields.reduce((acc, field) => {
//                         const [tableName, fieldName] = field.split('.');
//                         acc[field] = tableName === table ? mainRow[fieldName] : joinRow[fieldName];
//                         return acc;
//                     }, {});
//                 });
//         });
//     }


performInnerJoin = (data, joinData, joinCondition, fields, table) => {
    return data.flatMap(mainRow => {
        return joinData
            .filter(joinRow => {
                const mainValue = mainRow[joinCondition.left.split('.')[1]];
                const joinValue = joinRow[joinCondition.right.split('.')[1]];
                return mainValue === joinValue;
            })
            .map(joinRow => {
                return fields.reduce((acc, field) => {
                    const [tableName, fieldName] = field.split('.');
                    acc[field] = tableName === table ? mainRow[fieldName] : joinRow[fieldName];
                    return acc;
                }, {});
            });
    });
}

performLeftJoin = (data, joinData, joinCondition, fields, table) => {
    return data.flatMap(mainRow => {
        const matchingRows = joinData.filter(joinRow => {
            const mainValue = mainRow[joinCondition.left.split('.')[1]];
            const joinValue = joinRow[joinCondition.right.split('.')[1]];
            return mainValue === joinValue;
        });

        return matchingRows.length > 0
            ? matchingRows.map(joinRow => {
                return fields.reduce((acc, field) => {
                    const [tableName, fieldName] = field.split('.');
                    acc[field] = tableName === table ? mainRow[fieldName] : joinRow[fieldName];
                    return acc;
                }, {});
            })
            : fields.map(field => {
                const [tableName, fieldName] = field.split('.');
                return {
                    [field]: tableName === table ? mainRow[fieldName] : null
                };
            });
    });
}

performRightJoin = (data, joinData, joinCondition, fields, table) => {
    return joinData.flatMap(joinRow => {
        const matchingRows = data.filter(mainRow => {
            const mainValue = mainRow[joinCondition.left.split('.')[1]];
            const joinValue = joinRow[joinCondition.right.split('.')[1]];
            return mainValue === joinValue;
        });

        return matchingRows.length > 0
            ? matchingRows.map(mainRow => {
                return fields.reduce((acc, field) => {
                    const [tableName, fieldName] = field.split('.');
                    acc[field] = tableName === table ? mainRow[fieldName] : joinRow[fieldName];
                    return acc;
                }, {});
            })
            : fields.map(field => {
                const [tableName, fieldName] = field.split('.');
                return {
                    [field]: tableName === table ? null : joinRow[fieldName]
                };
            });
    });
}

async function executeSELECTQuery(query) {
    const { fields, table, whereClauses, joinType, joinTable, joinCondition } = parseQuery(query);
    let data = await readCSV(`${table}.csv`);

    // Logic for applying JOINs
    if (joinTable && joinCondition) {
        const joinData = await readCSV(`${joinTable}.csv`);
        switch (joinType.toUpperCase()) {
            case 'INNER':
                data = performInnerJoin(data, joinData, joinCondition, fields, table);
                break;
            case 'LEFT':
                data = performLeftJoin(data, joinData, joinCondition, fields, table);
                break;
            case 'RIGHT':
                data = performRightJoin(data, joinData, joinCondition, fields, table);
                break;
            // Handle default case or unsupported JOIN types
        }
    }
    
    // Apply WHERE clause filtering after JOIN (or on the original data if no join)
    const filteredData = whereClauses.length > 0
        ? data.filter(row => whereClauses.every(clause => evaluateCondition(row, clause)))
        : data;

    // Select the specified fields
    return filteredData.map(row => {
        const selectedRow = {};
        fields.forEach(field => {
            // Assuming 'field' is just the column name without table prefix
            selectedRow[field] = row[field];
        });
        return selectedRow;
    })
}

function evaluateCondition(row, clause) {
    const { field, operator, value } = clause;
    switch (operator) {
        case '=': return row[field] === value;
        case '!=': return row[field] !== value;
        case '>': return row[field] > value;
        case '<': return row[field] < value;
        case '>=': return row[field] >= value;
        case '<=': return row[field] <= value;
        default: throw new Error(`Unsupported operator: ${operator}`);
    }
}

module.exports = executeSELECTQuery;