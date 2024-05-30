// defining variables
var word='',finish=0;
var col=1,row=1,hint=['-','-','-','-','-'];
var list;
var hint_dict;
var hint_obj = {};
var possibleWordList;
var guessList = []; 
var target;
const animationGap=500;//ms
const lightash="rgb(88,88,80)";

// root variable selection
const root = document.documentElement;
const style = getComputedStyle(root);

// game start function
function startGame()
{
    // fetching word list
    fetch("../static/ultimate.txt") 
        .then(response=>response.text()) // arrow functions
        .then(contents =>{
            list=contents.split('\r\n');
            target=list[Math.floor(Math.random()*(list.length))];

            // possible wordlist initialization
            possibleWordList=list;

            // fetching hint dictionary 
            fetch("../static/hint_dict.json") 
            .then(response=>response.json()) // arrow functions
            .then(contents =>{
                // hint dict initialization
                hint_dict = contents
                // get the hint distribution of each guess
                hint_obj = updateHintObj(hint_dict);

                // writing data
                let result=document.getElementById("result");
                let text=document.createTextNode("Possible Words: "+(possibleWordList).length);
                result.innerHTML="";
                result.appendChild(text);

                // forming a table with the data
                tableUpdate(hint_obj);
                // every data should be empty
                let advance=document.getElementById("advance");
                advance.innerHTML="";
                let advance2=document.getElementById("advance2");
                advance2.innerHTML="";
            })
            .catch(error => alert(error))
            // starting the keydown checking
            document.addEventListener('keydown',keyRegister);
        })
        .catch(error => alert(error))
}

function restartGame() {
    // delete words and colors from the letter and key boxes
    for (let id1 = 1; id1 <= 30; id1++) {        
        id2="_".concat(id1)
        p=document.getElementById (id1)
        box=document.getElementById (id2)
        p.textContent = "";
        box.style.backgroundColor="transparent";
        box.classList.remove("animated");
        box.classList.remove("win");
    }
    for( let alphabet of [...'abcdefghijklmnopqrstuvwxyz']){
        keys = document.getElementById(alphabet);
        keys.style.backgroundColor="transparent";
    }
    let result=document.getElementById("h2_heading");
    result.innerHTML="";
    if (finish!=0) {
        text=document.createTextNode("Let's Play again");
    }else{
        text=document.createTextNode("Let's Play");
    }
    result.appendChild(text);

    word='',finish=0;
    col=1,row=1,hint=['-','-','-','-','-'];
    startGame()
}

// registering key down events
function keyRegister(e)
{   
    id1=col+(row-1)*5;
    // managing two type of entries by key board or by mouse-click
    try {
        let key = e.toUpperCase();
    } 
    catch (error) {
        e=e.key;
        let key = e.toUpperCase();
    }
    // alphabets settings
    if (e.length==1 && e.match(/[a-z]/i) && col<6){
        // adding letters
        word=word.concat(e);
        col++;
        // displaying
        id= "_".concat(id1);
        p=document.getElementById (id1)
        box=document.getElementById (id)
        p.textContent = e;
        box.style.borderColor = lightash;
    }else if (e === "Enter" && col == 6)// enter settings
    {
        word = word.toLowerCase()
        // checking if the word is valid
        if (list.includes(word)){
            col=1;
            row++;
            if (row===7) finish=1;
            word_reveal(word,hint);
            word = "";
            hint = ['-','-','-','-','-'];
        }
        // animation for wrong words
        else {
            for (let i = 0; i < 5; i++) {
                var id= "_".concat(String(i+1+(row-1)*5));
                let box=document.getElementById (id);
                box.classList.add("wrong");
                box.style.animationDelay=String(0)+"ms";
                setTimeout(()=>{
                    box.classList.remove("wrong");
                },1.5*animationGap)
            }
        }
    }else if (e==='Backspace' && col>1)// backspace settings
    {    
        // deleting letters
        word=word.substring(0,word.length -1);
        --col;
        --id1;
        id= "_".concat(id1);
        // displaying
        p=document.getElementById (id1);
        box=document.getElementById (id);
        p.textContent="";
        box.style.borderColor=style.getPropertyValue('--wrong');
    }
}

// showing hint
function word_reveal(word,hint)
{
    // get the hint
    for (let i = 0; i < 5; i++) {
        var letter = word[i];
        if (letter===target[i]){
            hint[i]='X';
        } 
        else{
            for (let j = 0; j < 5; j++){
                if(letter==target[j]){
                    hint[i]='O';
                    break;
                }
            }
        }
    }

    
    // checking if the game is finished
    let str_hint=hint.join("");
    if (str_hint === "XXXXX"){
        finish=2;
        // win animation
        winAnimation(word,hint);
    }else{
        // word animation
        wordAnimation(word,hint)
    }

    // If the game has ended
    if(finish!=0){
        // removing the event listener after finish
        document.removeEventListener('keydown',keyRegister);
        keys=document.querySelectorAll(".key-box");
        keys.forEach( element=>{
            element.removeAttribute("onclick");
        });
        showResult();
    }

    let advance2=document.getElementById("advance2");
    advance2.innerHTML=""
    let text=document.createTextNode("Your word: "+word.toUpperCase());
    advance2.appendChild(text)
    advance2.appendChild(document.createElement("br"))
    text=document.createTextNode("No. of partions: "+ Object.keys(hint_obj[word].list).length);
    advance2.appendChild(text)
    advance2.appendChild(document.createElement("br"))
    let obj = hint_obj[word];
    var hint_list = Object.keys(hint_obj[word].list);
    hint_list.sort((h1,h2) => obj.list[h2].length-obj.list[h1].length);
    text=document.createTextNode("Largest partition: "+obj.list[hint_list[0]].length);
    advance2.appendChild(text)
    advance2.appendChild(document.createElement("br"))
    advance2.appendChild(document.createElement("br"))
    if (row>=3 & possibleWordList.length<=200) {
        for (const h of hint_list) {
            let div=document.createElement('div');
            for (const iterator of [...h]) {
                let box =document.createElement('span');
                if(iterator=='X') box.classList.add("spanright");
                else if(iterator=='O') box.classList.add("spanmiddle");
                else box.classList.add("spanwrong");
                div.appendChild(box);
            }
            text=document.createTextNode(" "+Math.round(100*(obj.list[h].length)/possibleWordList.length,2) +" %");
            div.appendChild(text)
            advance2.appendChild(div);
            div=document.createElement('div');
            for (const iterator of obj.list[h]) {
                text=document.createTextNode(iterator.toUpperCase()+" "+Math.round(100/possibleWordList.length,2) +" %");
                div.appendChild(text);
                div.appendChild(document.createElement("br"));    
            }
            advance2.appendChild(div);
            advance2.appendChild(document.createElement("br"));    
        }
    }

    // data writing 
    let advance=document.getElementById("advance");
    text=document.createTextNode("Guess "+(row-1)+": "+word.toUpperCase());
    advance.appendChild(text)
    advance.appendChild(document.createElement("br"))
    text=document.createTextNode("words: "+(possibleWordList).length);
    advance.appendChild(text)
    advance.appendChild(document.createElement("br"))
    text=document.createTextNode("uncertainty: "+ (Math.log2((possibleWordList).length)).toFixed(2)+" bit");
    advance.appendChild(text)
    advance.appendChild(document.createElement("br"))
    text=document.createTextNode("expected info: "+(hint_obj[word].info).toFixed(2)+" bit");
    advance.appendChild(text)
    advance.appendChild(document.createElement("br"))
    let prevlength=(possibleWordList).length

    // update everything
    updateLists(word,hint)

    // data writing 
    let result=document.getElementById("result");
    result.innerHTML="";
    text=document.createTextNode("Remaining Words: "+(possibleWordList).length);
    result.appendChild(text);
    if (possibleWordList.length!=0) {
        text=document.createTextNode("gained info: "+(Math.log2(prevlength/(possibleWordList).length)).toFixed(2)+" bit");
        advance.appendChild(text)
        advance.appendChild(document.createElement("br"))
        text=document.createTextNode("remaining words: "+(possibleWordList).length);
        advance.appendChild(text)
        advance.appendChild(document.createElement("br"))
        text=document.createTextNode("uncertainty: "+ (Math.log2((possibleWordList).length)).toFixed(2)+" bit");
        advance.appendChild(text)
    }else{
        text=document.createTextNode("gained info: 0.00 bit");
        advance.appendChild(text)
        advance.appendChild(document.createElement("br"))
        text=document.createTextNode("remaining words: "+(possibleWordList).length);
        advance.appendChild(text)
        text=document.createTextNode("uncertainty: 0.00 bit");
        advance.appendChild(text)
    }
    advance.appendChild(document.createElement("br"))
    advance.appendChild(document.createElement("br"))
    advance.scrollTo({
        top: advance.scrollHeight,
        behaviour:'smooth',
    })


    // forming a table with the data
    if(possibleWordList.length==1 | row == 6){
        let table=document.getElementById("list");
        table.innerHTML="";
        possibleWordList.sort((k1,k2) =>{
            return hint_obj[k2].info-hint_obj[k1].info;
        }); 
        for (let i = 0; i < possibleWordList.length; i++) {
            const w = possibleWordList[i];
            let tab_row=table.insertRow();
            let cell=tab_row.insertCell();
            let text=document.createTextNode(w);
            cell.appendChild(text);
            cell=tab_row.insertCell();
            text=document.createTextNode((hint_obj[w].skill).toFixed(2)+"%");
            cell.appendChild(text);
        }
    }
    else{
        tableUpdate(hint_obj)
    }
}

// win animation
function winAnimation(word,hint) {
    // animating the win
    wordAnimation(word,hint)
    setTimeout(()=>{
        for (let i = 0; i < 5; i++) {
            var id= "_".concat(String(i+1+(row-2)*5));
            let box=document.getElementById (id);
            box.classList.add("win");
            box.style.animationDelay=String((animationGap*i)/8)+"ms"; 
        }
    },(animationGap*6)/2)
}

// word reveal animation
function wordAnimation(word,hint) {
    // animating the hint
    for (let i = 0; i < 5; i++) {
        var id= "_".concat(String(i+1+(row-2)*5));
        var letter = word[i];
        let box=document.getElementById (id);
        let keybox=document.getElementById (letter);
        box.classList.add("animated");
        box.style.animationDelay=String((animationGap*i)/2)+"ms";
        setTimeout(()=>{
            box.style.backgroundColor=style.getPropertyValue('--wrong');
            box.style.borderColor="";
            keybox.style.backgroundColor=style.getPropertyValue('--wrong');
            if (hint[i]=='X'){
                box.style.backgroundColor=style.getPropertyValue('--right');
                keybox.style.backgroundColor=style.getPropertyValue('--right');
            } 
            else if(hint[i]=='O'){
                box.style.backgroundColor=style.getPropertyValue('--middle');
                keybox.style.backgroundColor=style.getPropertyValue('--middle');
            }
        },(animationGap*(i+1))/2)
    }
}


// update everything
function updateLists(word,hint){ 
    // updating the possibleWordList
    let updated_list=[];
    let str_hint=hint.join("")
    let i = 0;
    if (possibleWordList.length==1 & possibleWordList.includes(word)) {
        possibleWordList=[]
    }
    else{
        for (const w of possibleWordList) {
            if (hint_dict[word][w] == str_hint) {
                updated_list[i++] = w;
            }
        }
        possibleWordList = updated_list;
    }
    
    // updating the hint dict
    for (const w of list) {
        const new_obj=Object.fromEntries(
            possibleWordList.map(d=>[d,hint_dict[w][d]])
        )
        hint_dict[w]=new_obj
    }
    
    // updating hint Obj
    hint_obj = updateHintObj(hint_dict)
}

function updateHintObj(hint_dict) {
    var  hintObj={}
    for (const key of list) {
        hintObj[key]={};
        let obj={
            list:{},
            info:0,
            skill:0,
        }
        // list (for graphical purpose)
        for (const word of possibleWordList) {
            let h = hint_dict[key][word]
            if(obj.list[h]){
                obj.list[h].push(word);
            }else{
                obj.list[h]=[word];
            }
        }
        let sum=0;
        // expected info calculation
        for (const h in obj.list) {
            let p = (obj.list[h].length)/(possibleWordList.length);
            sum -= Math.log2(p)*p;
        }
        obj.info = sum
        // relative percentage info
        if (possibleWordList.length!=1) {
            obj.skill = (obj.info*100)/Math.log2(possibleWordList.length);
        }else{
            obj.skill=100
        }
        
        hintObj[key] = obj;
    }
    return hintObj;
}

function tableUpdate(hint_obj) {
    let table=document.getElementById("list");
    table.innerHTML="";
    let picks = list;
    picks.sort((k1,k2) =>{
        if(hint_obj[k2].info-hint_obj[k1].info!=0){
            return hint_obj[k2].info-hint_obj[k1].info;
        }
        else{
            if(possibleWordList.includes(k1)) return -1;
            else return 0;
        }
    });
    for (let i = 0; i < picks.length; i++) {
        const w = picks[i];
        let tab_row=table.insertRow();
        let cell=tab_row.insertCell();
        let text=document.createTextNode(w);
        cell.appendChild(text);
        cell=tab_row.insertCell();
        text=document.createTextNode((hint_obj[w].skill).toFixed(2)+"%");
        cell.appendChild(text);
    }
}

// last part
function showResult(){
    let result=document.getElementById("h2_heading");
    result.innerHTML="";
    if(finish==1) {
        text=document.createTextNode("The word was "+ target.toUpperCase());
    } 
    else  {
        const adjectives=['Genius','Magnificent','Impressive','Splendid','Great','Phew']
        text=document.createTextNode(adjectives[(row-2)])
    }
    result.appendChild(text);
}

// starting the game
startGame();

// stats settings
const statBtn = document.getElementById("stats")
const statsContainer= document.getElementById("stats-container")
let enable = false
if(statBtn){
    statBtn.addEventListener('click',()=>{
        enable = !enable 
        if(enable){
            statBtn.classList.add('orange2');
            statsContainer.classList.add('stats-appear');
            var x =window.matchMedia("(max-width: 1152px)");
            if(x.matches){
                const gameContainer=document.getElementById("game_container");
                gameContainer.classList.add('game-smaller');
            }
            
        }
        else{
            statBtn.classList.remove('orange2');
            statsContainer.classList.remove('stats-appear');
            var x =window.matchMedia("(max-width: 1152px)");
            if(x.matches){
                const gameContainer=document.getElementById("game_container");
                gameContainer.classList.remove('game-smaller');
            }
        }
    })
}