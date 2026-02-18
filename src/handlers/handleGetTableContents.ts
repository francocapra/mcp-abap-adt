import { McpError, ErrorCode } from '../lib/utils';
import { makeAdtRequest, return_error, getBaseUrl } from '../lib/utils';

function parseDataPreviewXml(xml: string): { columns: string[]; rows: Record<string, string>[] } {
    const columns: { name: string; description: string }[] = [];
    const dataSets: string[][] = [];

    // Extract each <dataPreview:columns> block
    const colRegex = /<dataPreview:columns>([\s\S]*?)<\/dataPreview:columns>/g;
    let colMatch;
    while ((colMatch = colRegex.exec(xml)) !== null) {
        const block = colMatch[1];
        // Extract column metadata
        const nameMatch = /dataPreview:name="([^"]*)"/.exec(block);
        const descMatch = /dataPreview:description="([^"]*)"/.exec(block);
        const name = nameMatch ? nameMatch[1] : '';
        const description = descMatch ? descMatch[1] : '';
        columns.push({ name, description });

        // Extract data values
        const values: string[] = [];
        const dataRegex = /<dataPreview:data>([\s\S]*?)<\/dataPreview:data>/g;
        let dataMatch;
        while ((dataMatch = dataRegex.exec(block)) !== null) {
            values.push(dataMatch[1]);
        }
        dataSets.push(values);
    }

    // Transpose column-oriented data into rows
    const rowCount = dataSets.length > 0 ? dataSets[0].length : 0;
    const rows: Record<string, string>[] = [];
    for (let i = 0; i < rowCount; i++) {
        const row: Record<string, string> = {};
        for (let c = 0; c < columns.length; c++) {
            row[columns[c].name] = dataSets[c]?.[i] ?? '';
        }
        rows.push(row);
    }

    return { columns: columns.map(c => `${c.name} (${c.description})`), rows };
}

export async function handleGetTableContents(args: any) {
    try {
        if (!args?.table_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Table name is required');
        }
        const maxRows = args.max_rows || 100;
        const tableName = args.table_name.toUpperCase();
        const url = `${await getBaseUrl()}/sap/bc/adt/datapreview/ddic`;
        const response = await makeAdtRequest(url, 'POST', 30000, '', {
            rowNumber: maxRows,
            ddicEntityName: tableName
        });

        const parsed = parseDataPreviewXml(response.data);
        return {
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify(parsed, null, 2)
            }]
        };
    } catch (error) {
        return return_error(error);
    }
}
