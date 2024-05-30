# game class
class game:
    def __init__(self):
        self.data=None
        self.words=None
        self.target=""
        self.hint='-----'
        self.guess=None
        self.word_list=[]

    def give_hint(self,target,guess):
        hint=['-' for i in range(5)]
        for i in range(5):
            if(guess[i]==target[i]):
                hint[i]='X'
            else:
                for j in range(5):
                    if (guess[i]==target[j]):
                        hint[i]='O'
        return "".join(hint)

    def update_list(self,word_list):
        a_list=[]
        for target in word_list:
            if self.give_hint(target,self.guess)==self.hint:
                a_list.append(target)
        return a_list

    def give_best_guess(self, word_list ):
        if len(word_list)==1:
            a_list=[]
            for item in word_list:
                a_list.append((item,(1,1)))
            return a_list
        a_list=[]
        data=self.data[word_list]
        for guess in (self.words):
            if word_list ==self.words:
                a_list.append((guess,((self.data.loc[guess].value_counts()**2).sum()/len(word_list),1)))
            elif guess in word_list:
                a_list.append((guess,((data.loc[guess].value_counts()**2).sum()/len(word_list),0)))
            else:
                a_list.append((guess,((data.loc[guess].value_counts()**2).sum()/len(word_list),1)))
        a_list.sort(key=lambda x:x[1])
        
        return a_list
    