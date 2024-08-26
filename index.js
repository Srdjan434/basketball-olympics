const fs = require('fs');

// Čitanje fajla
const groups = fs.readFileSync('./groups.json', 'utf8');

// Parsiranje JSON sadržaja
const groupsObj = JSON.parse(groups);

// console.log(groupsObj);


/// Grupna faza
const groupResults = {}
const groupTable = {}


function main(){
    // Dohvatanje svih timova i raspored parova (svako sa svakim)

    for(const group in groupsObj){
        const teams = groupsObj[group]
        const match = []
        for(let i = 0; i<teams.length; i++){
            for(let j = i+1; j<teams.length; j++){
                team1Score = calculateScore(teams[i])
                team2Score = calculateScore(teams[j])
                match.push({ match: `${teams[i].Team} - ${teams[j].Team}`, result: `(${team1Score}:${team2Score})`})
            }
        }
        groupResults[group] = match

        groupTable[group] = [];
        for(let i = 0; i<teams.length; i++){
            const calculateTeamStats = calculateGroupTeamResult(teams[i],groupResults[group], teams)
            groupTable[group] = [
                ...groupTable[group],
                calculateTeamStats
            ]
        }

        groupTable[group].sort((a, b) => {
            if (b.points !== a.points) {
              return b.points - a.points;
            }
        
            const mutualScoreAB = a.mutualScore[b.team] || 0;
            const mutualScoreBA = b.mutualScore[a.team] || 0;
        
            if (mutualScoreAB !== mutualScoreBA) {
              return mutualScoreBA - mutualScoreAB;
            }
        
            return 0;
          });

    }

    // console.log(groupResults)
    console.log(JSON.stringify(groupTable,null,2))

}

// Racunanje i simulacija rezultata

function calculateScore(team){
    const baseScore = 100 - team.FIBARanking
    const randomScore = Math.floor(Math.random() * 15) - 7
    return baseScore + randomScore
}

// Formiranje tabele na osnovu rezultata

function calculateGroupTeamResult(team,allGroupResults,allTeams) {
    let wins = 0
    let lose = 0
    let points = 0
    let basketPlus = 0
    let basketMinus = 0
    let basketDiff = 0
    let mutualScore = {}
    for(const mutualTeam of allTeams){
        if(mutualTeam.Team != team.Team){
            mutualScore[mutualTeam.Team] = 0
        }
    }
    for(const groupMatch of allGroupResults){
        const team1 = groupMatch.match.split(' - ')[0]
        const team2 = groupMatch.match.split(' - ')[1]
        const result = groupMatch.result.substring(1,groupMatch.result.length - 1)
        const result1 = parseInt(result.split(':')[0])
        const result2 = parseInt(result.split(':')[1])

        if(groupMatch.match.includes(team.Team)){
            if(team.Team == team1){
                basketPlus += result1
                basketMinus += result2
                if(result1 > result2){
                    wins += 1
                    points += 2
                    for(const mutualTeam in mutualScore){
                        if(mutualTeam == team2){
                            mutualScore[mutualTeam] += 1
                        }
                    }
                } else {
                    lose += 1
                    points += 1
                    for(const mutualTeam in mutualScore){
                        if(mutualTeam == team2){
                            mutualScore[mutualTeam] -= 1
                        }
                    }
                }
            } 
            if(team.Team == team2){
                basketPlus += result2
                basketMinus += result1
                if(result2 > result1){
                    wins += 1
                    points +=2 
                    for(const mutualTeam in mutualScore){
                        if(mutualTeam == team1){
                            mutualScore[mutualTeam] += 1
                        }
                    }
                } else {
                    lose += 1
                    points += 1
                    for(const mutualTeam in mutualScore){
                        if(mutualTeam == team1){
                            mutualScore[mutualTeam] -= 1
                        }
                    }
                }
            }
        }
    }
    basketDiff = basketPlus - basketMinus;
    // console.log('Reprezentacija', team.Team, 'Broj pobeda', wins, 'Broj poraza', lose, 'Broj poena', points, 'Broj datih koseva', basketPlus, 'Broj primljenih koseva', basketMinus, 'Kos razlika', basketDiff)
    return {
        team: team.Team,
        wins,
        lose,
        points,
        basketPlus,
        basketMinus,
        basketDiff,
        mutualScore
    }
}

// Sortiranje po medjusobnim skorom

function sortByMutualScore(allTableResults){
    for(let i = 0; i<allTableResults.length; i++){
        let j = i + 1;
        for(let j = i+1; j<allTableResults.length; j++){
            console.log('allTableResults[i]', allTableResults[i]);
            console.log('allTableResults[j]', allTableResults[j]);
            if(allTableResults[i].points == allTableResults[j].points){
                console.log('isti su points')
                if(!allTableResults[i].mutualScore[allTableResults[j].team]){
                    console.log('Zameniti mesta')
                } 
            }
        }
    }
}



main()