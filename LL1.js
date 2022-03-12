/* *********************************************
Author: Jirakit Jirapongwanich
********************************************* */

var productions;
var items;
var FA;
var table;
const lambda = 'λ';

$('textarea[name=production]').keyup(function () {
    const val = $(this).val().replace(/(lambda|epsilon|empty)/g, 'λ')
    $(this).val(val);
})

$('textarea[name=production]').change(function () {
    var line = $('textarea[name=production]').val().split('\n');
    productions = [];
    var line = line.forEach(production => {
        var production = production.split('->');
        var left = production[0].trim();
        var right = production[1].split('|');
        right.forEach(r => {
            productions.push({
                rule: left,
                token: r.trim().split(' ')
            })
        })
    });
    displayRule();
    allFirstAndFollow();
    relationTable();
    table = createParseTable();
});

function displayRule() {
    $("#disp-rules").html('');
    productions.forEach(p => {
        $("#disp-rules").append($(`<div>${p.rule} → ${p.token.join(' ')}</div>`))
    })
}

Array.prototype.insert = function (index, item) {
    this.splice(index, 0, item);
}

Array.prototype.count = function (item) {
    var i = 0;
    for (var i=0; i<this.length; i++){
        if (this[i] == item)
            i++;
    }
    return i;
}

Set.prototype.isSub = function(other){
    for (const elem of this){
        if (! other.has(elem))
            return false;
    }
    return true;
}

Set.prototype.isSup = function(other){
    for (const elem of other){
        if (! this.has(elem))
            return false;
    }
    return true;
}

Set.prototype.equals = function (other) {
    if (this.size != other.size)
        return false;
    if (this.isSub(other) && this.isSub(other)){
        return true;
    }
}

function ruleOf(token) {
    return productions.find((p) => p.rule == token);
}

function isTerminal(token) {
    return productions.find((p) => p.rule == token) === undefined;
}

function isNonterminal(token){
    return ! isTerminal(token);
}

function show(item){
    return `${item.rule} → ${item.token.join(' ')}`
}

Set.prototype.union = function (other) {
    var union = new Set(this);
    for (const elem of other) {
        union.add(elem);
    }
    return union;
}

function getTokens(){
    var tokens = new Set([]);
    for (const production of productions){
        tokens = tokens.union([production.rule, ...production.token]);
    }
    return [...tokens];
}

function first(production){
    var out = new Set([]);
    if (isTerminal(production)){
        return new Set([production])
    }
    for (const p of productions.filter(p=>{ return p.rule == production})){
        if (isTerminal(p.token[0]))
            out = out.union([p.token[0]]);
        else{
            if (p.token[0] != production)
                out = out.union(first(p.token[0]));
        }
    }
    return out;
}

// def follow(self, production, start=None):
// if not start: start = self.start
// out = set()
// if production==start:
//     out |= {'$'}
// for B in self.rule:
//     for p in self.rule[B]:
//         if production in p:
//             #print(B,p)
//             if p.index(production) + 1 < len(p):
//                 Y = p[p.index(production) + 1]
//             else:
//                 Y = 'λ'
//             #print(Y, self.first(Y))
//             # print(Y)
//             if 'λ' in self.first(Y):
//                 out |= self.first(Y) - {'λ'}
//                 if B!=production:
//                     out |= self.follow(B, start)
//             else:
//                 out |= self.first(Y) - {'λ'}
// return out

// function follow(production, count=0){
//     out = new Set([]);
//     if (production==productions[0].rule){
//         out = out.union(['$']);
//     }
//     for (const B of new Set(productions.map(p=>p.rule))){
//         for (const p of productions.filter(p=>p.rule==B).map(p=>p.token)){
//             temp = [...p]
//             while (temp.indexOf(production) != -1){
//                 if (temp.indexOf(production) + 1 < temp.length){
//                     Y = temp[temp.indexOf(production) + 1];
//                 }else{
//                     Y = lambda;
//                 }
//                 temp[temp.indexOf(production)] = '.'
//                 if (first(Y).has(lambda)){
//                     out = out.union([...first(Y)].filter(f=>f!=lambda));
//                     if (B != production){
//                         out = out.union(follow(B, ++count));
//                     }
//                 }else{
//                     out = out.union([...first(Y)].filter(f=>f!=lambda));
//                 }
//             }
//         }
//     }
//     return out;
// }

function follow(production, caller=[]){
    out = new Set([]);
    if (production==productions[0].rule){
        out = out.union(['$']);
    }
    for (const B of new Set(productions.map(p=>p.rule))){
        for (const p of productions.filter(p=>p.rule==B).map(p=>p.token)){
            temp = [...p]
            while (temp.indexOf(production) != -1){
                if (temp.indexOf(production) + 1 < p.length){
                    Y = temp[temp.indexOf(production) + 1];
                }else{
                    Y = lambda;
                }
                temp[temp.indexOf(production)] = '.'
                if (first(Y).has(lambda)){
                    out = out.union([...first(Y)].filter(f=>f!=lambda));
                    if (B != production && caller.count(production)<10){
                        caller.push(production)
                        out = out.union(follow(B, caller));
                    }
                }else{
                    out = out.union([...first(Y)].filter(f=>f!=lambda));
                }
            }
        }
    }
    return out;
}


function allFirstAndFollow(){
    $('#disp-ff').html('');
    for (const p of new Set(productions.map(p=>p.rule))){
        $('#disp-ff').append(`<tr>
            <td>${p}</td>
            <td>{ ${[...first(p)].join(', ')} }</td>
            <td>{ ${[...follow(p)].join(', ')} }</td>
        </tr>`)
    }
}

function relationTable(){
    $('#disp-relation-header').html('<th>Nonterminal</th>');
    $('#disp-relation').html('');
    header = new Set(productions.map(p=>p.rule));
    for (const p of header){
        $('#disp-relation-header').append(`<th> first(${p}) </th>`)
    }
    for (const p of header){
        $('#disp-relation-header').append(`<th> follow(${p}) </th>`)
    }
    for (const p of header){
        const tr = $(`<tr><th>first(${p})</th></tr>`)
        A = first(p);
        for (const a of header){
            B = first(a)
            if (A.equals(B)){
                tr.append(`<td>=</td>`)
            }else if (A.isSub(B)){
                tr.append(`<td>⊆</td>`)
            }else if (A.isSup(B)){
                tr.append(`<td>⊃</td>`)
            }else{
                tr.append(`<td>≠</td>`)
            }
        }
        for (const b of header){
            B = follow(b)
            if (A.equals(B)){
                tr.append(`<td>=</td>`)
            }else if (A.isSub(B)){
                tr.append(`<td>⊆</td>`)
            }else if (A.isSup(B)){
                tr.append(`<td>⊃</td>`)
            }else{
                tr.append(`<td>≠</td>`)
            }
        }
        $('#disp-relation').append(tr);
    }
    for (const p of header){
        const tr = $(`<tr><th>follow(${p})</th></tr>`)
        A = follow(p);
        for (const a of header){
            B = first(a)
            if (A.equals(B)){
                tr.append(`<td>=</td>`)
            }else if (A.isSub(B)){
                tr.append(`<td>⊆</td>`)
            }else if (A.isSup(B)){
                tr.append(`<td>⊃</td>`)
            }else{
                tr.append(`<td>≠</td>`)
            }
        }
        for (const b of header){
            B = follow(b)
            if (A.equals(B)){
                tr.append(`<td>=</td>`)
            }else if (A.isSub(B)){
                tr.append(`<td>⊆</td>`)
            }else if (A.isSup(B)){
                tr.append(`<td>⊃</td>`)
            }else{
                tr.append(`<td>≠</td>`)
            }
        }
        $('#disp-relation').append(tr);
    }
}

// def createParseTables(self):
//         token = self.getToken() | {'$'}
//         table = {r:{t:set() for t in token } for r in self.rule}
//         for nt in self.rule:
//             i=0
//             for p in self.rule[nt]:
//                 X = p[0]
//                 for a in self.first(X):
//                     if a != 'λ':
//                         table[nt][a] |= {i}
//                     if 'λ' in self.first(X):
//                         for b in self.follow(nt):
//                             table[nt][b] |= {i}
//                             # print(nt,a,b)
//                 i+=1
//         self.table = table
//         return table

function createParseTable(){
    const table = {};
    token = getTokens();
    if (token.indexOf(lambda)!=-1){
        token[token.indexOf(lambda)] = '$';
    }else{
        token.push('$');
    }
    token = token.sort()
    $("#parsetoken").html('<th>State</th>')
    for (const t of token.filter(t=>isTerminal(t))){
        $("#parsetoken").append(`<th>${t}</th>`)
    }
    i = 0;
    $('#parsetable').html('')
    for (const nt of new Set(productions.map(p=>p.rule))){
        var data = `<td>${nt}</td>`;
        for (const p of productions.filter(p=>p.rule==nt).map(p=>p.token)){
            X = p[0];
            for (const a of first(X)){
                if (!table[nt]){
                    table[nt] = {};
                }
                if (a != lambda){
                    if (!table[nt][a]){
                        table[nt][a] = new Set([]);
                    }
                    table[nt][a].add(i);
                }
                if (first(X).has(lambda)){
                    for (const b of follow(nt)){
                        if (!table[nt][b]){
                            table[nt][b] = new Set([]);
                        }
                        table[nt][b].add(i);
                    }
                }
            }
            i+=1;
        }
        for (const t of token.filter(t=>isTerminal(t))){
            if (table[nt][t] && table[nt][t].size > 1){
                data += `<td class='text-danger'>${(table[nt][t] ? [...(table[nt][t])].join(', ') : '')}</td>`;
            }else{
                data += `<td>${(table[nt][t] ? [...(table[nt][t])].join(', ') : '')}</td>`;
            }
        }
        $('#parsetable').append(`<tr>${data}</tr>`)
    }
    return table;
}

var limit = 100;

$('input[name=test]').change(function(){
    const val = $(this).val().split(' ');
    const stack = ['$', productions[0].rule];
    const input = [...val, '$'];
    var i = 0;
    var itercount = 0;
    var accept = false;
    $('#run').html('')
    $('#diviation').html('<h3>Diviation</h3>')
    while (input[i] != '$' || stack[stack.length - 1] != '$'){
        $('#diviation').append(`<div><b>${input.slice(0,i).join(' ')}</b> ${[].concat(stack).reverse().join(' ')}</div>`)
        console.log(stack, input.slice(i))
        if (isNonterminal(stack[stack.length - 1])){
            t = stack.pop();
            if (input[i] in table[t]){
                action = [...table[t][input[i]]][0]
            }
            else{
                $('#run').append(`<tr>
                    <td>${stack.join(' ')}</td>
                    <td  class='text-end'>${input.slice(i).join(' ')}</td>
                    <td>Error (can't replace ${t},${i})</td>
                </tr>`)
                break;
            }
            $('#run').append(`<tr>
                    <td>${[...stack, t].join(' ')}</td>
                    <td  class='text-end'>${input.slice(i).join(' ')}</td>
                    <td>replace ${action}</td>
                </tr>`)
            for (let c = productions[action].token.length - 1; c >= 0; c--){
                if (productions[action].token[c]!=lambda)
                    stack.push(productions[action].token[c]);
            }
        }else{
            if (stack[stack.length - 1]===input[i]){
                $('#run').append(`<tr>
                    <td>${stack.join(' ')}</td>
                    <td class='text-end'>${input.slice(i).join(' ')}</td>
                    <td>match</td>
                </tr>`)
                stack.pop()
                i += 1;
            }else{
                $('#run').append(`<tr>
                    <td>${stack.join(' ')}</td>
                    <td class='text-end'>${input.slice(i).join(' ')}</td>
                    <td>Error (inappropriate match)</td>
                </tr>`)
                break;
            }
        }
        itercount++;
        if (itercount > limit){
            alert('iteration limit exceed');
            break;
        }
    }
    if (stack[stack.length - 1] == '$' && input[i] == '$'){
        $('#run').append(`<tr>
                        <td>${stack.join(' ')}</td>
                        <td  class='text-end'>${input.slice(i).join(' ')}</td>
                        <td>Accept</td>
        </tr>`);
        $('#diviation').append(`<div><b>${input.slice(0,i).join(' ')}</b> ${[].concat(stack).reverse().join(' ')}</div>`)
    }
})