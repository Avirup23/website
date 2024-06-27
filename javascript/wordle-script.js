// defining variables
var word = "",
    finish = 0;
var col = 1,
    row = 1,
    hint = ["-", "-", "-", "-", "-"];
var list;
var usablelist;
var prob;
var hint_dict = {};
var hint_obj = {};
var possibleWordList;
var guessList = [];
var target;
var animationGap = 300; //ms
const lightash = "rgb(88,88,80)";
// var animationHandler = 1;

// root variable selection
const root = document.documentElement;
const style = getComputedStyle(root);

// var x = window.matchMedia("(max-width: 700px)")
// if(x.matches){
//     null;
// }

// game start function
function startGame() {
    fetch("../static/usablelist.txt")
        .then((response) => response.text()) // arrow functions
        .then((contents) => {
            usablelist = [];
            let rows = contents.split("\r\n");
            for (r of rows) {
                usablelist.push(r.split(",")[0]);
            }
        })
        .catch((error) => alert(error));
    // fetching word list
    fetch("../static/targetlist.txt")
        .then((response) => response.text()) // arrow functions
        .then((contents) => {
            list = {};
            let rows = contents.split("\r\n");
            for (r of rows) {
                list[r.split(",")[0]] = parseFloat(r.split(",")[1]);
            }

            // possible wordlist initialization
            possibleWordList = list;
            // fetching hint dictionary
            fetch("../static/hint_dict.csv")
                .then((res) => res.text())
                .then((textdata) => {
                    let rows = textdata.trim().split("\r\n");
                    var header = rows[0].split(",");
                    // console.log(header)
                    for (let i = 1; i < rows.length; i++) {
                        const r = rows[i].split(",");
                        const rowindex = r[0];
                        const rowobj = {};
                        for (let j = 1; j < header.length; j++) {
                            rowobj[header[j]] = r[j];
                        }
                        hint_dict[rowindex] = rowobj;
                    }
                    // console.log(hint_dict)
                })
                .then(() => {
                    // get the hint distribution of each guess
                    hint_obj = updateHintObj(hint_dict);

                    // writing data
                    let result = document.getElementById("result");
                    let text = document.createTextNode(
                        "Possible Words: " +
                            Object.keys(possibleWordList).length
                    );
                    result.innerHTML = "";
                    result.appendChild(text);

                    // every data should be empty
                    let advance = document.getElementById("advance");
                    advance.innerHTML = ">> INFORMATION LOG :";
                    advance.appendChild(document.createElement("br"));
                    advance.appendChild(document.createElement("br"));
                    let advance2 = document.getElementById("advance2");
                    advance2.innerHTML = ">> PERFORMANCE LOG :";
                    advance2.appendChild(document.createElement("br"));
                    advance2.appendChild(document.createElement("br"));
                    // forming a table with the data
                    tableUpdate(hint_obj);
                })
                .then(() => {
                    let random = Math.random();
                    let cumsum = 0;
                    console.log(random);
                    for (const t in possibleWordList) {
                        cumsum += possibleWordList[t];
                        if (cumsum > random) {
                            target = t;
                            break;
                        }
                    }
                    document.addEventListener("keydown", keyRegister);
                    const loader = document.querySelector(".loader-page");
                    loader.classList.add("loader-hidden");
                });
        })
        .catch((error) => alert(error));
}

function restartGame() {
    // delete words and colors from the letter and key boxes
    for (let id1 = 1; id1 <= 30; id1++) {
        id2 = "_".concat(id1);
        p = document.getElementById(id1);
        box = document.getElementById(id2);
        p.textContent = "";
        box.style.backgroundColor = "transparent";
        box.style.animationDelay = 0 + "ms";
        box.classList.remove("animated");
        box.classList.remove("win");
    }
    for (let alphabet of [..."abcdefghijklmnopqrstuvwxyz"]) {
        keys = document.getElementById(alphabet);
        keys.style.backgroundColor = "transparent";
    }
    let result = document.getElementById("h2_heading");
    result.innerHTML = "";
    if (finish != 0) {
        text = document.createTextNode("Let's Play again");
        // adding the event listener after finish
        keys = document.querySelectorAll(".key-box");
        keys.forEach((element) => {
            element.setAttribute("onclick", "keyRegister(id)");
        });
    } else {
        text = document.createTextNode("Let's Play");
    }
    result.appendChild(text);

    (word = ""), (finish = 0);
    (col = 1), (row = 1), (hint = ["-", "-", "-", "-", "-"]);
    startGame();
}

// registering key down events
function keyRegister(e) {
    id1 = col + (row - 1) * 5;
    // managing two type of entries by key board or by mouse-click
    try {
        let key = e.toUpperCase();
    } catch (error) {
        e = e.key;
        let key = e.toUpperCase();
    }
    // alphabets settings
    if (e.length == 1 && e.match(/[a-z]/i) && col < 6) {
        // adding letters
        word = word.concat(e);
        col++;
        // displaying
        id = "_".concat(id1);
        p = document.getElementById(id1);
        box = document.getElementById(id);
        p.textContent = e;
        box.style.borderColor = lightash;
    } else if (e === "Enter" && col == 6) {
        // enter settings
        word = word.toLowerCase();
        // checking if the word is valid
        if (usablelist.includes(word)) {
            col = 1;
            row++;
            if (row === 7) finish = 1;
            word_reveal(word, hint);
            word = "";
            hint = ["-", "-", "-", "-", "-"];
        }
        // animation for wrong words
        else {
            for (let i = 0; i < 5; i++) {
                var id = "_".concat(String(i + 1 + (row - 1) * 5));
                let box = document.getElementById(id);
                box.classList.add("wrong");
                box.style.animationDelay = String(0) + "ms";
                setTimeout(() => {
                    box.classList.remove("wrong");
                }, 500);
            }
        }
    } else if (e === "Backspace" && col > 1) {
        // backspace settings
        // deleting letters
        word = word.substring(0, word.length - 1);
        --col;
        --id1;
        id = "_".concat(id1);
        // displaying
        p = document.getElementById(id1);
        box = document.getElementById(id);
        p.textContent = "";
        box.style.borderColor = style.getPropertyValue("--wrong");
    }
}

// showing hint
function word_reveal(word, hint) {
    // get the hint
    hint = giveHint(word, target);

    let str_hint = hint.join("");

    if (str_hint === "XXXXX") {
        finish = 2;
        // win animation
        winAnimation(word, hint);
    } else {
        // word animation
        wordAnimation(word, hint);
    }

    // If the game has ended
    if (finish != 0) {
        // removing the event listener after finish
        document.removeEventListener("keydown", keyRegister);
        keys = document.querySelectorAll(".key-box");
        keys.forEach((element) => {
            element.removeAttribute("onclick");
        });
        showResult();
    }

    advancedata(word, hint);

    // forming a table with the data
    if ((Object.keys(possibleWordList).length == 1) | (row == 6)) {
        let table = document.getElementById("list");
        table.innerHTML = "";
        Object.keys(possibleWordList).sort((k1, k2) => {
            return hint_obj[k2].info - hint_obj[k1].info;
        });
        for (w in possibleWordList) {
            let tab_row = table.insertRow();
            let cell = tab_row.insertCell();
            let text = document.createTextNode(w);
            cell.appendChild(text);
            cell = tab_row.insertCell();
            text = document.createTextNode(hint_obj[w].skill.toFixed(2) + "%");
            cell.appendChild(text);
        }
    } else {
        tableUpdate(hint_obj);
    }
}

function giveHint(word, t) {
    h = ["-", "-", "-", "-", "-"];
    for (let i = 0; i < 5; i++) {
        var letter = word[i];
        if (letter === t[i]) {
            h[i] = "X";
        } else {
            for (let j = 0; j < 5; j++) {
                if (letter === t[j]) {
                    h[i] = "O";
                    break;
                }
            }
        }
    }
    return h;
}

// win animation
function winAnimation(word, hint) {
    // animating the win
    wordAnimation(word, hint);
    setTimeout(() => {
        for (let i = 0; i < 5; i++) {
            var id = "_".concat(String(i + 1 + (row - 2) * 5));
            let box = document.getElementById(id);
            box.style.animationDelay = String((animationGap * i) / 6) + "ms";
            box.classList.add("win");
        }
    }, animationGap * 5 + 350);
}

// word reveal animation
function wordAnimation(word, hint) {
    // animating the hint
    for (let i = 0; i < 5; i++) {
        var id = "_".concat(String(i + 1 + (row - 2) * 5));
        var letter = word[i];
        let box = document.getElementById(id);
        let keybox = document.getElementById(letter);
        box.classList.add("animated");
        box.style.animationDelay = String(animationGap * i) + "ms";
        setTimeout(() => {
            setTimeout(() => {
                box.style.backgroundColor = style.getPropertyValue("--wrong");
                box.style.borderColor = "";
                keybox.style.backgroundColor =
                    style.getPropertyValue("--wrong");
                if (hint[i] == "X") {
                    box.style.backgroundColor =
                        style.getPropertyValue("--right");
                    keybox.style.backgroundColor =
                        style.getPropertyValue("--right");
                } else if (hint[i] == "O") {
                    box.style.backgroundColor =
                        style.getPropertyValue("--middle");
                    keybox.style.backgroundColor =
                        style.getPropertyValue("--middle");
                }
            }, animationGap * i);
        }, 350);
    }
}

// update everything
function updateLists(word, hint) {
    // updating the possibleWordList
    let updated_list = [];
    let str_hint = hint.join("");
    let i = 0;
    if ((Object.keys(possibleWordList).length == 1) & possibleWordList[word]) {
        possibleWordList = {};
    } else {
        for (const t in possibleWordList) {
            h = giveHint(word, t).join("");
            if (h == str_hint) {
                updated_list[i++] = t;
            }
        }
        let sumprob = 0;
        possibleWordList = updated_list.reduce((updated, key) => {
            updated[key] = possibleWordList[key];
            sumprob += possibleWordList[key];
            return updated;
        }, {});
        possibleWordList = Object.entries(possibleWordList).reduce(
            (normalised, [key, value]) => {
                normalised[key] = value / sumprob;
                return normalised;
            },
            {}
        );
    }
    // updating the hint dict
    for (const w in list) {
        const new_obj = Object.fromEntries(
            Object.keys(possibleWordList).map((d) => [d, hint_dict[w][d]])
        );
        hint_dict[w] = new_obj;
    }
    // updating hint Obj
    hint_obj = updateHintObj(hint_dict);
}

function updateHintObj(hint_dict) {
    var hintObj = {};
    for (const key in list) {
        hintObj[key] = {};
        let obj = {
            list: {},
            info: 0,
            skill: 0,
        };
        let infocalc = {};
        // list
        for (const w in possibleWordList) {
            let h = hint_dict[key][w];
            if (obj.list[h]) {
                obj.list[h].push(w);
                infocalc[h] += possibleWordList[w];
            } else {
                obj.list[h] = [w];
                infocalc[h] = possibleWordList[w];
            }
        }

        obj.info = Object.values(infocalc).reduce((info, p) => {
            info -= Math.log2(p) * p;
            return info;
        }, 0);
        // relative percentage info
        if (Object.keys(possibleWordList).length != 1) {
            obj.skill =
                (obj.info * 100) /
                Math.log2(Object.keys(possibleWordList).length);
        } else {
            obj.skill = 100;
        }

        hintObj[key] = obj;
    }
    return hintObj;
}

function advancedata(word, hint) {
    let prevlength = Object.keys(possibleWordList).length;
    let advance2 = document.getElementById("advance2");
    advance2.innerHTML ="";
    advance2.innerHTML = ">> PERFORMANCE LOG :";
    advance2.appendChild(document.createElement("br"));
    let text = document.createTextNode("> Your Word: " + word.toUpperCase());
    advance2.appendChild(text);
    advance2.appendChild(document.createElement("br"));

    let h;
    let obj = {};
    for (const t in possibleWordList) {
        h = giveHint(word, t).join("");
        if (obj[h]) {
            obj[h].list.push(t);
            obj[h].prob += possibleWordList[t];
        } else {
            obj[h] = {
                list: [t],
                prob: possibleWordList[t],
            };
        }
    }
    text = document.createTextNode(
        "> No. of Partions: " + Object.keys(obj).length
    );
    advance2.appendChild(text);
    advance2.appendChild(document.createElement("br"));
    var hint_list = Object.keys(obj);
    hint_list.sort((h1, h2) => obj[h2].prob - obj[h1].prob);
    text = document.createTextNode(
        "> Largest Partition: " + obj[hint_list[0]].list.length
    );
    advance2.appendChild(text);
    advance2.appendChild(document.createElement("br"));
    advance2.appendChild(document.createElement("br"));
    text = document.createTextNode(
        "> All Partitions: "
    );
    advance2.appendChild(text);
    advance2.appendChild(document.createElement("br"));

    for (const h of hint_list) {
        let div = document.createElement("div");
        for (const iterator of [...h]) {
            let box = document.createElement("span");
            if (iterator == "X") box.classList.add("spanright");
            else if (iterator == "O") box.classList.add("spanmiddle");
            else box.classList.add("spanwrong");
            div.appendChild(box);
        }
        text = document.createTextNode(
            " (" + Math.round(obj[h].prob * 100, 2) + "%)"
        );
        div.appendChild(text);
        advance2.appendChild(div);
        if (prevlength <= 200) {
            obj[h].list.sort((w1,w2)=>possibleWordList[w2]-possibleWordList[w1])
            div = document.createElement("div");
            for (const t of obj[h].list) {
                text = document.createTextNode(
                    t.toUpperCase() +
                        " " +
                        Math.round(possibleWordList[t] * 100, 2) +
                        " %"
                );
                div.appendChild(text);
                div.appendChild(document.createElement("br"));
            }
            advance2.appendChild(div);
            advance2.appendChild(document.createElement("br"));
        }
    }

    // data writing
    let advance = document.getElementById("advance");
    text = document.createTextNode(
        "> Guess " + (row - 1) + ": " + word.toUpperCase()
    );
    advance.appendChild(text);
    advance.appendChild(document.createElement("br"));
    text = document.createTextNode("> possible words: " + prevlength);
    advance.appendChild(text);
    advance.appendChild(document.createElement("br"));
    text = document.createTextNode(
        "> uncertainty: " + Math.log2(prevlength).toFixed(2) + " bit"
    );
    advance.appendChild(text);
    advance.appendChild(document.createElement("br"));

    // update everything
    updateLists(word, hint);

    // data writing
    let newlength = Object.keys(possibleWordList).length;
    let result = document.getElementById("result");
    result.innerHTML = "";
    text = document.createTextNode("Remaining Words: " + newlength);
    result.appendChild(text);
    let info = 0;
    for (const h in obj) {
        p = obj[h].prob;
        info -= Math.log2(p) * p;
    }
    // console.log("info" + info);
    text = document.createTextNode(
        "> expected info: " + info.toFixed(2) + " bit"
    );
    advance.appendChild(text);
    advance.appendChild(document.createElement("br"));
    if (newlength != 0) {
        text = document.createTextNode(
            "> gained info: " +
                Math.log2(prevlength / newlength).toFixed(2) +
                " bit"
        );
        advance.appendChild(text);
        advance.appendChild(document.createElement("br"));
        text = document.createTextNode("> remaining words: " + newlength);
        advance.appendChild(text);
        advance.appendChild(document.createElement("br"));
        text = document.createTextNode(
            "> uncertainty: " + Math.log2(newlength).toFixed(2) + " bit"
        );
        advance.appendChild(text);
    } else {
        text = document.createTextNode("> gained info: 0.00 bit");
        advance.appendChild(text);
        advance.appendChild(document.createElement("br"));
        text = document.createTextNode("> remaining words: 0");
        advance.appendChild(text);
        advance.appendChild(document.createElement("br"));
        text = document.createTextNode("> uncertainty: 0.00 bit");
        advance.appendChild(text);
    }
    advance.appendChild(document.createElement("br"));
    advance.appendChild(document.createElement("br"));
    advance.scrollTo({
        top: advance.scrollHeight,
        behaviour: "smooth",
    });
}

function tableUpdate(hint_obj) {
    let table = document.getElementById("list");
    table.innerHTML = "";
    if (Object.keys(possibleWordList) != 0) {
        let picks = Object.keys(list);
        picks.sort((k1, k2) => {
            if (hint_obj[k2].info - hint_obj[k1].info != 0) {
                return hint_obj[k2].info - hint_obj[k1].info;
            } else if((+Object.keys(possibleWordList).includes(k2)) - (+Object.keys(possibleWordList).includes(k1)) != 0){
                return (+Object.keys(possibleWordList).includes(k2)) - (+Object.keys(possibleWordList).includes(k1));
            } else{
                return possibleWordList[k2]-possibleWordList[k1];
            }
        });
        let div = document.createElement("div");
        let text = document.createTextNode('--');
        div.appendChild(text);
        table.appendChild(div);
        for (let i = 0; i < picks.length; i++) {
            const w = picks[i];
            let tab_row = table.insertRow();
            let cell = tab_row.insertCell();
            let text = document.createTextNode(w);
            cell.appendChild(text);
            cell = tab_row.insertCell();
            text = document.createTextNode(hint_obj[w].skill.toFixed(2) + "%");
            cell.appendChild(text);
        }
        table_scroller=document.getElementById('tablescroll');
        table_scroller.scrollTop = 0;
    }
}

// last part
function showResult() {
    let result = document.getElementById("h2_heading");
    result.innerHTML = "";
    if (finish == 1) {
        text = document.createTextNode("The word was " + target.toUpperCase());
    } else {
        const adjectives = [
            "Genius",
            "Magnificent",
            "Impressive",
            "Splendid",
            "Great",
            "Phew",
        ];
        text = document.createTextNode(adjectives[row - 2]);
    }
    result.appendChild(text);
}

// starting the game
startGame();

// stats settings
const statBtn = document.getElementById("stats");
const statsContainer = document.getElementById("stats-container");
let enable = false;
if (statBtn) {
    statBtn.addEventListener("click", () => {
        enable = !enable;
        var message = document.getElementById("message");
        if (enable) {
            statBtn.classList.add("orange2");
            statsContainer.classList.add("stats-appear");
            if(finish!=2){
                message.classList.add("show-message");
            }
        } else {
            statBtn.classList.remove("orange2");
            statsContainer.classList.remove("stats-appear");
        }
    });
}
