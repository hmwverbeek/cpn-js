/**
 * Clear declaration layout: remove line breaks, multiple spaces, comments
 * 
 * @param layout 
 */
export function clearDeclarationLayout(layout) {
    // remove line break
    layout = layout.replace(/\n/g, '');
    // remove multiple spaces
    layout = layout.replace(/\s{2,}/g, ' ');
    // remove comments
    layout = layout.replace(/(\(\*\s*)[^\*]+(\s*\*\))/g, '');

    return layout;
}

/**
 * Parse declaration layout: extract declaration type
 * 
 * @param layout 
 */
export function parseDeclarartion(layout) {
    let result = undefined;

    const regex = /^(?<declarationType>\w+)/g;
    let m = regex.exec(layout);

    if (m && m.groups && m.groups.declarationType) {
        result = {};
        result.declarationType = m.groups.declarationType;

        switch (m.groups.declarationType) {
            case 'colset':
                result.cpnElement = parseColsetDeclaration(layout);
                break;
        }
    }
    return result;
}

/**
 * Parse colset declaration: extract name, type and extentions (with, and, timed)
 * 
 * @param layout 
 */
function parseColsetDeclaration(layout) {
    let result = undefined;

    let regex = /colset\s+(?<name>\w+)\s*=\s*(?<type>\w+)/g;
    let m = regex.exec(layout);
    let m2;

    console.log('onParse(), parseColsetDeclaration(), layout = ', layout);

    if (m && m.groups && m.groups.name && m.groups.type) {

        let type: any = "";
        let typeName = m.groups.type;

        console.log('onParse(), parseColsetDeclaration(), m = ', m);

        switch (m.groups.type) {
            case 'unit':
                type = parseUnitDeclarartion(layout);
                break;
            case 'bool':
                type = parseBoolDeclarartion(layout);
                break;
            case 'int':
            case 'intinf':
            case 'real':
                type = parseNumericDeclarartion(layout);
                break;
            case 'time':
                break;
            case 'string':
                type = parseStringDeclarartion(layout);
                break;
            case 'with':
                type = parseEnumDeclarartion(layout);
                typeName = "enum";
                break;
            case 'index':
                type = parseIndexDeclarartion(layout);
                break;

            case 'product':
                type = parseProductDeclarartion(layout);
                break;
            case 'record':
                type = parseRecordDeclarartion(layout);
                break;

        }

        result = {
            id: m.groups.name
        };
        result[typeName] = type;
        result.layout = layout;
    }

    return result;
}

function parseUnitDeclarartion(layout) {
    let type: any = "";

    const regex = /with\s+(?<new_unit>\w+)/g;
    const m = regex.exec(layout);

    if (m && m.groups && m.groups.new_unit) {
        type = {
            with: {
                id: m.groups.new_unit
            }
        };
    }
    return type;
}

function parseBoolDeclarartion(layout) {
    let type: any = "";

    const regex = /with\s*\(\s*(?<new_false>\w+)\s*\,\s*(?<new_true>\w+)\s*\)/g;
    const m = regex.exec(layout);

    if (m && m.groups && m.groups.new_false && m.groups.new_true) {
        type = {
            with: {
                id: [m.groups.new_false, m.groups.new_true]
            }
        };
    }
    return type;
}

function parseNumericDeclarartion(layout) {
    let type: any = "";

    const regex = /with\s+(?<exp1>[\w\.]+)\s*\.\.\s*(?<exp2>[\w\.]+)/g;
    const m = regex.exec(layout);

    if (m && m.groups && m.groups.exp1 && m.groups.exp2) {
        type = {
            with: {
                ml: [m.groups.exp1, m.groups.exp2]
            }
        };
    }
    return type;
}

function parseStringDeclarartion(layout) {
    let type: any = "";

    const stringExpList = [];
    const intExpList = [];

    let regex = /with\s+(?<string_exp1>\"\w+\")\s*\.\.\s*(?<string_exp2>\"\w+\")/g;
    let m = regex.exec(layout);

    if (m && m.groups && m.groups.string_exp1 && m.groups.string_exp2) {
        stringExpList.push(m.groups.string_exp1);
        stringExpList.push(m.groups.string_exp2);
    }

    regex = /and\s+(?<int_exp1>\w+)\s*\.\.\s*(?<int_exp2>\w+)/g;
    m = regex.exec(layout);

    if (m && m.groups && m.groups.int_exp1 && m.groups.int_exp2) {
        intExpList.push(m.groups.int_exp1);
        intExpList.push(m.groups.int_exp2);
    }

    if (stringExpList.length > 0) {
        type = {
            with: {
                ml: stringExpList
            }
        };

        if (intExpList.length > 0) {
            type.with.and = {
                ml: intExpList
            };
        }
    }

    return type;
}

function parseIndexDeclarartion(layout) {
    let type: any = "";

    const regex = /(?<id>\w+)\s+with\s+(?<int_exp1>\w+)\s*\.\.\s*(?<int_exp2>\w+)/g;
    const m = regex.exec(layout);

    if (m && m.groups && m.groups.id && m.groups.int_exp1 && m.groups.int_exp2) {
        type = {
            ml: [m.groups.int_exp1, m.groups.int_exp2],
            id: m.groups.id
        };
    }
    return type;
}

function parseEnumDeclarartion(layout) {
    let type: any = "";

    const regex = /(with\s+(?<id>\w+))|(\|\s*(?<id2>\w+))/g;
    let m;

    const idList = [];

    while ((m = regex.exec(layout)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        if (m && m.groups) {
            if (m.groups.id) {
                // console.log('onParse(), parseEnumDeclarartion(), m.groups.id = ', m.groups.id);
                idList.push(m.groups.id);
            }
            if (m.groups.id2 && idList.length > 0) {
                // console.log('onParse(), parseEnumDeclarartion(), m.groups.id2 = ', m.groups.id2);
                idList.push(m.groups.id2);
            }
        }
    }

    // console.log('onParse(), parseEnumDeclarartion(), layout = ', layout);

    if (idList.length > 0) {
        type = {
            id: idList
        };
    }
    return type;
}

function parseProductDeclarartion(layout) {
    let type: any = "";

    const regex = /(product\s+(?<name>\w+))|(\*\s*(?<name2>\w+))/g;
    let m;

    const nameList = [];

    while ((m = regex.exec(layout)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        if (m && m.groups) {
            if (m.groups.name) {
                nameList.push(m.groups.name);
            }
            if (m.groups.name2 && nameList.length > 0) {
                nameList.push(m.groups.name2);
            }
        }
    }

    if (nameList.length > 0) {
        type = {
            id: nameList
        };
    }
    return type;
}

function parseRecordDeclarartion(layout) {
    let type: any = "";

    const regex = /(record\s+(?<id>\w+)\s*:\s*(?<name>\w+))|(\*\s*(?<id2>\w+)\s*:\s*(?<name2>\w+))/g;
    let m;

    const fieldList = [];

    while ((m = regex.exec(layout)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        if (m && m.groups) {
            if (m.groups.id && m.groups.name) {
                fieldList.push({ id: [m.groups.id, m.groups.name] });
            }
            if (m.groups.id2 && m.groups.name2 && fieldList.length > 0) {
                fieldList.push({ id: [m.groups.id2, m.groups.name2] });
            }
        }
    }

    if (fieldList.length > 0) {
        type = {
            recordfield: fieldList
        };
    }
    return type;
}
