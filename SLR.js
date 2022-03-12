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
    displayItem();
    createFA();
    createDFA();
    table = createParseTable();
});

function displayRule() {
    $("#disp-rules").html('');
    productions.forEach(p => {
        $("#disp-rules").append($(`<div>${p.rule} → ${p.token.join(' ')}</div>`))
    })
}

function displayItem() {
    generateItems();
    $("#disp-items").html('');
    items.forEach(p => {
        $("#disp-items").append($(`<div>${p.rule} → ${p.token.join(' ')}</div>`))
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

function generateItems() {
    items = [];
    items.push({
        rule: 'S\'',
        token: ['.', productions[0].rule],
        of: 'Accept',
    })
    items.push({
        rule: 'S\'',
        token: [productions[0].rule, '.'],
        of: 'Accept',
    })
    var No = 0;
    for (production of productions) {
        No++;
        if (production.token.length === 1 && production.token[0] === 'λ') {
            items.push({
                rule: production.rule,
                token: ['.'],
                of: No,
            })
            continue;
        }
        for (var i = 0; i < production.token.length; i++) {
            const X = [...production.token];
            X.insert(i, '.');
            items.push({
                rule: production.rule,
                token: X,
                of: No,
            })
        }
        const X = [...production.token];
        X.push('.')
        items.push({
            rule: production.rule,
            token: X,
            of: No,
        })
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

function createFA() {
    FA = {
        initial: 0,
        current: [0],
        states: [],
        dispatch: function(token){
            var next = new Set([]); 
            for (const cur of this.current){
                next = new Set([...next, ...this.states[cur].on[token]]);
            }
            this.current = [...next];
            var closure = new Set([...this.current]); 
            for (const cur of this.current){
                closure = new Set([...closure, ...this.states[cur].on[lambda]]);
            }
            this.current = [...closure];
        },
        init: function(){
            this.current = [this.initial];
            var closure = new Set([...this.current]); 
            for (const cur of this.current){
                closure = new Set([...closure, ...this.states[cur].on[lambda]]);
            }
            this.current = [...closure];
        }
    }
    $("#disp-nfa").html('');
    $("#disp-nfa-tran").html('');
    for (var i=0; i<items.length; i++) {
        FA.states[i] = {on: {}};
        $("#disp-nfa").append($(`<div>${i}: ${items[i].rule} → ${items[i].token.join(' ')}</div>`))
    }
    for (var s=0; s<FA.states.length; s++){
        const dp = items[s].token.indexOf('.')
        if (dp == items[s].token.length - 1) {
            continue;
        }else{
            const shift = items[s].token[dp + 1];
            FA.states[s].on[shift] = FA.states[s].on[shift] ? [...FA.states[s].on[shift], s + 1] : [s + 1];
            $("#disp-nfa-tran").append($(`<div>[ ${s} ]--- ${shift} --> ${s+1}</div>`))
            if (isNonterminal(shift)){
                const lis = [];
                for (var i=0; i<items.length; i++){
                    if (items[i].rule == shift && items[i].token.indexOf('.')==0){ // A -> . B
                        lis.push(i);
                        $("#disp-nfa-tran").append($(`<div> ${s} --- ${lambda} --> ${i}</div>`))
                    }
                }
                FA.states[s].on[lambda] = [...lis];
            }
        }
    }
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

function createDFA(){
    DFA = {
        initial: 0,
        current: 0,
        states: [],
        dispatch: function(token){
            this.current = nextOf(this.states[this.current].on[token]);
        }
    }
        i = 0;
        DFA.states.push({
            group: [...closureOf(i)],
            on: {},
        })
        while (i<DFA.states.length){
            state = DFA.states[i].group;
        var on = {};
        for (var x of state){
            const s = FA.states[i]
            for (const ent of Object.entries(FA.states[x].on)){
                key = ent[0];
                transition = ent[1];
                if (key===lambda) continue;
                for (const t of transition){
                    if (!on[key]){
                        on[key] = [t]
                    }else if (on[key].indexOf(t)===-1){
                        on[key].push(t);
                    }
                }
            }
        }
        for (const ent of Object.entries(on)){
            var cls = new Set([]);
            for (const s of ent[1]){
                cls = cls.union(closureOf(s));
            }
            cls = [...cls]
            DFA.states[i].on = on
            if (DFA.states.find((s) => s.group.join() == cls.sort().join()) === undefined){
                DFA.states.push({
                    group: cls.sort(),
                    on: {},
                })
            }
        }
        i++;
    }
    
    $('#disp-dfa').html('');
    $('#disp-dfa-tran').html('');
    for (var i=0; i<DFA.states.length; i++){
        $('#disp-dfa').append($(`<div>${i}: <ul>${DFA.states[i].group.map(function(s){
            return `<li>${show(items[s])}</li>`
        }).join('')}</ul></div>`))
        for (const ent of Object.entries(DFA.states[i].on)){
            $('#disp-dfa-tran').append($(`<div> ${i} --- ${ent[0]} --> ${ nextOf(ent[1])}</div>`));
        }
    }
    
}

function nextOf(group){
    var index = DFA.states.findIndex((f)=>{ return f.group.join()===group.sort().join()})
    if (index == -1){
        var index = DFA.states.findIndex((f)=>{ return f.group.indexOf(group[0]) != -1 })
    }
    return index;
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

function createLR0ParseTable(){
    token = getTokens().filter(f=>f!=lambda);
    token = token.sort();
    $('#lr0parsetoken').html('<th>State</th> <th>Action</th>')
    for (const t of token){
        $("#lr0parsetoken").append(`<th>${t}</th>`)
    }
    $('#lr0parsetable').html('')
    for (var i=0; i<DFA.states.length; i++){
        var data = `<td>${i}</td>`;
    if (Object.keys(DFA.states[i].on).filter(f=>f!=lambda).length === 0){
        data += `<td>reduce</td>`;
    }else{
        data += `<td>shift</td>`;
    }
    for (const t of token){
        var next;
            if (DFA.states[i].on[t]){
                var index = DFA.states.findIndex((f)=>{ return f.group.join()===DFA.states[i].on[t].sort().join()})
                if (index == -1){
                    var index = DFA.states.findIndex((f)=>{ return f.group.indexOf(DFA.states[i].on[t][0]) != -1 })
                }
                next = index;
            }
        data += `<td>${(DFA.states[i].on[t] ? next : '-')}</td>`;
    }
    $('#lr0parsetable').append(`<tr>${data}</tr>`)
    }
}

function createParseTable(){
    const table = {};
    token = getTokens();
    if (token.indexOf(lambda)!=-1){
        token[token.indexOf(lambda)] = '$';
    }else{
        token.push('$');
    }
    token = token.sort();
    $("#parsetoken").html('<th>State</th>')
    for (const t of token){
        $("#parsetoken").append(`<th>${t}</th>`)
    }
    $('#parsetable').html('')
    for (var i=0; i<DFA.states.length; i++){
        var data = `<td>${i}</td>`;
        table[i] = {};
        canReduce = false;
        for (const item of DFA.states[i].group){
            if (items[item].token.indexOf('.')===items[item].token.length - 1){
                console.log(items[item].token)
                reduceIf = (item != 1 ? follow(items[item].rule) : new Set(['$']));
                reduceTo = items[item].of;
                canReduce = true;
            }
        }
        for (const t of token){
            var action = '';
            if (canReduce && reduceIf.has(t)){
                action = `${(reduceTo!='Accept' ? 'R' : '') + reduceTo}`
            }
            var next;
            if (DFA.states[i].on[t]){
                var index = DFA.states.findIndex((f)=>{ return f.group.join()===DFA.states[i].on[t].sort().join()})
                if (index == -1){
                    var index = DFA.states.findIndex((f)=>{ return f.group.indexOf(DFA.states[i].on[t][0]) != -1 })
                }
                next = index;
            }
            data += `<td>${(DFA.states[i].on[t] ? ( isTerminal(t) ? 'S' : '') + next : (action ? action : ''))}</td>`;
            table[i][t] = (DFA.states[i].on[t] ? ( isTerminal(t) ? 'S' : '') + next : (action ? action : ''));
        }
        $('#parsetable').append(`<tr>${data}</tr>`)
    }
    return table;
}

function closureOf(state, closure=[]){
    var closure = [...closure, state];
    if (FA.states[state].on[lambda]){
        for (const c of FA.states[state].on[lambda]){
            if (closure.indexOf(c)==-1){
                if (FA.states[c].on[lambda]){
                    closure = [...(new Set(closureOf(c, closure)))];
                }else{
                    closure.push(c)
                }
            }
        }
    }
    return [...closure].sort();
}

$('input[name=test]').change(function(){
    const val = $(this).val().split(' ');
    const stack = ['$', 0];
    const input = [...val, '$'];
    var accept = false;
    $('#run').html('')
    while (!accept){
        const state = stack[stack.length-1];
        const nextToken = input[0];
        console.log(stack, state, nextToken, input)
        if (table[state][nextToken] == ''){
            $('#run').append(`<tr>
                    <td class='text-right'>${stack.join(' ')}</td>
                    <td>${input.slice(i).join(' ')}</td>
                    <td>Error : no move</td>
                </tr>`)
            break;
        }
        else if (isTerminal(nextToken)){
            let action, num;
            if (table[state][nextToken]==='Accept'){
                action = 'Accept';
                accept = true;
                $('#run').append(`<tr>
                    <td class='text-right'>${stack.join(' ')}</td>
                    <td>${input.join(' ')}</td>
                    <td>Accept</td>
                </tr>`)
                break;
            }else{
                action = table[state][nextToken][0]
                num = table[state][nextToken].slice(1);
            }
            $('#run').append(`<tr>
                <td class='text-right'>${stack.join(' ')}</td>
                <td>${input.join(' ')}</td>
                <td>${(action=='S' ? 'shift' : 'reduce ' + num)}</td>
            </tr>`)
            switch (action){
                case 'S':
                    stack.push(input.shift());
                    stack.push(parseInt(num));
                    break;
                case 'R':
                    const production = productions[num - 1];
                    if (production.token[0] !== lambda){
                        for (var i=0; i<production.token.length*2; i++){
                            stack.pop();
                        }
                    }
                    tos = stack[stack.length - 1];
                    stack.push(production.rule);
                    stack.push(parseInt(table[tos][production.rule]));
                    break;
            }
            console.log(stack, state, nextToken, input)
            
        }
    }
})