//@ts-nocheck
import { Utils } from "common-utils";
import path from 'path'
export interface ScipDetails {
    tradingsymbol: string;
}

let scips: ScipDetails[];

function getScips(): ScipDetails[] {
    if (!scips) {
        scips = Utils.readFileToObject(path.join(__dirname, './scips_full.json'))
    }
    return scips
}

function searchScipBySymbol(symbol: any): ScipDetails[] {
    let scips: ScipDetails[] = getScips();
    const searchQuery = symbol.replace(/\s/g, '').toLowerCase();
    const searchWords = symbol.toLowerCase().split(/\s+/);

    const filteredScips = scips.filter((scip) => {
        const scipSymbol = scip.tradingsymbol.replace(/\s/g, '').toLowerCase();
        for (const word of searchWords) {
            if (!scipSymbol.includes(word)) {
                return false;
            }
        }
        return true;
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
    getScips
}