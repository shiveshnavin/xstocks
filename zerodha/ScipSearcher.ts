//@ts-nocheck
import { Utils } from "common-utils";
import path from 'path'
import fs from 'fs'
export interface ScipDetails {
    tradingsymbol: string;
}

let scips: ScipDetails[];
let SCIP_FILE_PATH = path.join(__dirname, './scips_full.json')
let CSV_FILE_PATH = path.join(__dirname, './instruments.csv')
function getScips(): ScipDetails[] {
    if (!scips) {
        scips = Utils.readFileToObject(SCIP_FILE_PATH)
    }
    return scips
}

function convertInstrumentsCSVToJSON(csvPath) {
    let csvString = fs.readFileSync(csvPath).toString()
    const lines = csvString.split('\n');
    const headers = lines[0].split(',');
    const instruments = [];

    for (let i = 1; i < lines.length; i++) {
        const data = lines[i].split(',');
        const instrument = {};

        for (let j = 0; j < headers.length; j++) {
            instrument[headers[j]] = data[j];
        }

        instruments.push(instrument);
    }

    return fs.writeFileSync(SCIP_FILE_PATH, JSON.stringify(instruments, null, 2))
}

function searchScipBySymbol(symbol: any): ScipDetails[] {
    let scips: ScipDetails[] = getScips();
    const searchQuery = symbol.replace(/\s/g, '').toLowerCase();
    const searchWords = symbol.toLowerCase().split(/\s+/);

    const filteredScips = scips.filter((scip) => {
        if (scip.tradingsymbol) {
            const scipSymbol = scip.tradingsymbol.replace(/\s/g, '').toLowerCase();
            for (const word of searchWords) {
                if (!scipSymbol.includes(word)) {
                    return false;
                }
            }
            return true;
        }
        return false
    });

    return filteredScips.sort((a, b) => {
        const aSymbol = a.tradingsymbol.replace(/\s/g, '').toLowerCase();
        const bSymbol = b.tradingsymbol.replace(/\s/g, '').toLowerCase();

        const aScore = calculateScore(aSymbol, searchQuery);
        const bScore = calculateScore(bSymbol, searchQuery);

        return bScore - aScore;
    });
}

function calculateScore(symbol: string, query: string): number {
    const symbolWords = symbol.split(/\s+/);
    let score = 0;
    for (const word of symbolWords) {
        if (query.includes(word)) {
            score++;
        }
    }
    return score;
}


export const ScipSearcher = {
    searchScipBySymbol,
    getScips,
    convertInstrumentsCSVToJSON
}