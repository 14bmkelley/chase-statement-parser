
var fs = require('fs');
var pdfParser = require('pdf-parser');

var PDF_PATH = '../../../Downloads/20180710-statements-x9010-.pdf';

function process(pdf) {

    var result = {};

    pdf.pages.forEach((page) => {
        page.texts.forEach((item) => {

            var key = page.pageId + ':' + (10000 - item.top);

            item.pageId = page.pageId;
            
            if (result.hasOwnProperty(key))
                result[key].push(item);
            else
                result[key] = [ item ];

        });
    });

    var headingKeys = Object.keys(result).filter((key) => {
        var isHeading = false;

        result[key].forEach((item) => {
            if (result[key].length == 1
                && item.transform[0] == 14
                && item.transform[1] == 0
                && item.transform[2] == 0
                && item.transform[3] == 14)
                isHeading = true;
        });

        return isHeading;
    }).sort();

    var accountsHeadingKey = headingKeys.reduce((r, key) => {
        result[key].forEach((item) => {
            if (item.text == 'CONSOLIDATED BALANCE SUMMARY')
                r = key;
        });
        return r;
    }, null);

    var nextHeadingKey = headingKeys[headingKeys.indexOf(accountsHeadingKey) + 1];

    var accountLineKeys = Object.keys(result).filter((key) =>
        key > accountsHeadingKey && key < nextHeadingKey && result[key].length > 3);

    var accountHeadings = accountLineKeys.reduce((r, key) => {

        var accountName = result[key].sort((a, b) => a.left - b.left)[0].text;
        headingKey = headingKeys.filter((key) =>
            result[key][0].text.toLowerCase().includes(accountName.toLowerCase()))[0];

        r[headingKey] = accountName;
        return r;
    }, {});

    var lineKeys = Object.keys(result).filter((key) => {
        var containsDate = false;

        result[key].forEach((item) => {
            if (item.text.includes('/'))
                containsDate = true;
        });

        return containsDate && result[key].length > 3;
    });

    var accountKeys = Object.keys(accountHeadings).sort();

    var resultLines = lineKeys.reduce((r, key) => {
        var accountComp = Object.keys(accountHeadings);
        accountComp.push(key);
        accountComp.sort();

        var account = accountHeadings[accountKeys[accountComp.indexOf(key) - 1]];

        var lineItems = result[key].sort((a, b) => a.left - b.left).map((item) => item.text);

        var negativeIndex = lineItems.indexOf('-');

        if (negativeIndex != -1) {
            lineItems[negativeIndex + 1] = '-' + lineItems[negativeIndex + 1];
            lineItems.splice(negativeIndex, 1);
        }
        
        var line = account + '\t' + result[key][0].pageId + '\t' + lineItems.join('\t'); 

        r.push(line);
        return r;
    }, []);

    console.log(resultLines);

    fs.writeFile('./out.tsv', resultLines.join('\n'), (err) => console.log(err));
    console.log(fs.realpathSync('.'));

}

function printItemWithText(result, text) {
    Object.keys(result).forEach((key) => {
        result[key].forEach((item) => {
            if (item.text.includes(text))
                console.log(result[key]);
        });
    });
}

function printHeadings(result) {
    Object.keys(result).forEach((key) => {
        result[key].forEach((item) => {
            if (result[key].length == 1
                && item['transform'][0] == 14
                && item['transform'][1] == 0
                && item['transform'][2] == 0
                && item['transform'][3] == 14
                )
                console.log(result[key]);
        });
    });
}

pdfParser.pdf2json(PDF_PATH, function(error, pdf) {
    if (error) {
        console.log(error);
    }
    else {
        process(pdf);
    }
});

