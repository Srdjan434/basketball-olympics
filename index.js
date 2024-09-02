const fs = require('fs');

// Čitanje fajla
const groups = fs.readFileSync('./groups.json', 'utf8');
// Parsiranje JSON sadržaja
const groupsObj = JSON.parse(groups);
const simplifyGroups = {}


/// Grupna faza
const groupResults = {}
const groupTable = {}

const teamPlayOff = {}

function main(){
    // Dohvatanje svih timova i raspored parova (svako sa svakim)

    for(const group in groupsObj){
        const teams = groupsObj[group]
        simplifyGroups[group] = groupsObj[group].map((item) => item.Team)
        const match = []
        for(let i = 0; i<teams.length; i++){
            for(let j = i+1; j<teams.length; j++){
                let team1Score = 0;
                let team2Score = 0;
                while (team1Score === team2Score) {
                    team1Score = calculateScore(teams[i])
                    team2Score = calculateScore(teams[j])
                }
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

    const bestNine = nineBests(groupTable)

    const bestNineSorted = bestNine.sort((a, b) => {
        if(b.points != a.points){
            return b.points - a.points
        }
        const basketDiffA = a.basketDiff
        const basketDiffB = b.basketDiff

        if(basketDiffA != basketDiffB){
            return basketDiffB - basketDiffA
        }

        const basketPlusA = a.basketPlus
        const basketPlusB = b.basketPlus

        if(basketPlusA != basketPlusB){
            return basketPlusB - basketPlusA
        }

        return 0;
    })

    const bestEight = bestNineSorted.slice(0,-1);
    const {hatD,hatE,hatF,hatG} = playOff(bestEight)

    console.group("GRUPNA FAZA ")
        for(const group in groupResults){
            console.group(`GRUPA: ${group}`)
                for(let i = 0; i<groupResults[group].length; i++){
                    console.log(groupResults[group][i].match,groupResults[group][i].result)
                }
            console.groupEnd()
        }
    console.groupEnd()

    console.log('\n')

    console.group("KONACAN PLASMAN PO GRUPAMA ")
        for(const group in groupTable){
            console.group(`GRUPA  ${group} (Ime - Pobede/Porazi/Bodovi/Postignuti koševi/Primljeni koševi/Koš razlika):`)
                for(let i = 0; i<groupTable[group].length; i++){
                    let team = groupTable[group][i]
                    console.log(`${i+1}. ${team.team} - ${team.wins} / ${team.lose} / ${team.points} / ${team.basketPlus} / ${team.basketMinus} / ${team.basketDiff}`)
                }
            console.groupEnd()
        }
    console.groupEnd()

    console.log('\n')

    const printingHats = {D:hatD,E:hatE,F:hatF,G:hatG}

    console.group("SESIRI ")
        for(const hat in printingHats){
            console.group(`SESIR  ${hat}`)
                for(let i = 0; i<printingHats[hat].length; i++){
                    let team = printingHats[hat][i]
                    console.log(team.team)
                }
            console.groupEnd()
        }
    console.groupEnd()

    console.log('\n')
    const quarterFinalMatches = [
        ...playOffMatches(hatD,hatG),
        ...playOffMatches(hatE,hatF)
    ]
    const quarterFinalResults = calculateEliminatedFinalResults(quarterFinalMatches)

    const semiFinalMatches = [
        ...playOffMatches([
            {
                team: quarterFinalResults[0].winner,
                FIBARanking: quarterFinalResults[0].winnerFibaRanking
            },
            {
                team: quarterFinalResults[1].winner,
                FIBARanking: quarterFinalResults[1].winnerFibaRanking
            }
        ],
        [
            {
                team: quarterFinalResults[2].winner,
                FIBARanking: quarterFinalResults[2].winnerFibaRanking
            },
            {
                team: quarterFinalResults[3].winner,
                FIBARanking: quarterFinalResults[3].winnerFibaRanking
            }
        ])
    ]

    const semiFinalMatchesResult = calculateEliminatedFinalResults(semiFinalMatches)
    const finalMathces = getFinalMatches(semiFinalMatchesResult)
    const finalMathcesResults = calculateEliminatedFinalResults(finalMathces)

    console.group("CETVRTFINALE ")
        for(const team of quarterFinalResults){
            console.log(team.match,team.result)
        }
    console.groupEnd()

    console.log("\n")

    console.group("POLUFINALE ")
    for(const team of semiFinalMatchesResult){
        console.log(team.match,team.result)
    }
    console.groupEnd()

    console.log("\n")

    console.group("UTAKMICA ZA TRECE MESTO ")
        console.log(finalMathcesResults[1].match, finalMathcesResults[1].result)
    console.groupEnd()

    console.log("\n")

    console.group("FINALE ")
        console.log(finalMathcesResults[0].match, finalMathcesResults[0].result)
    console.groupEnd()

    console.log("\n")

    console.group("MEDALJE ")
        console.log('1.', finalMathcesResults[0].winner)
        console.log('2.', finalMathcesResults[0].loser)
        console.log('3.', finalMathcesResults[1].winner)
    console.groupEnd()

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
    return {
        team: team.Team,
        wins,
        lose,
        points,
        basketPlus,
        basketMinus,
        basketDiff,
        mutualScore,
        FIBARanking: team.FIBARanking
    }
}

// Izbor 9 najboljih ekipa i prolaz 8 najboljih

function nineBests(groupTable){
    const firstTeams = []
    const secondTeams = []
    const thirdTeams = []
    for(const group in groupTable){
        for(let i = 0; i<groupTable[group].length; i++){
            if(i==0){
                firstTeams.push(groupTable[group][i])
            }
            if(i==1){
                secondTeams.push(groupTable[group][i])
            }
            if(i==2){
                thirdTeams.push(groupTable[group][i])
            }
        }
    }
  
    return [...firstTeams,...secondTeams,...thirdTeams]

}

// Raspored 8 najboljih ekipa u sesire (moje misljenje da se dohvata po indeksu tima)

function playOff (bestTeams){
    let hatD = []
    let hatE = []
    let hatF = []
    let hatG = []

    for(let i = 0; i<bestTeams.length; i++){
        if( i == 0 || i == 1 ){
            hatD.push(bestTeams[i])
        }
        if( i == 2 || i == 3 ){
            hatE.push(bestTeams[i])
        }
        if( i == 4 || i == 5 ){
            hatF.push(bestTeams[i])
        }
        if( i == 6 || i == 7 ){
            hatG.push(bestTeams[i])
        }
    }
    return {hatD,hatE,hatF,hatG}
}

function playOffMatches (firstGroup,secondGroup){
    let randomNumberFirstGroup = Math.round(Math.random())
    let randomNumberSecondGroup = Math.round(Math.random())

    const matchOneTeamOne = firstGroup[randomNumberFirstGroup]
    const matchOneTeamTwo = secondGroup[randomNumberSecondGroup]

    if(randomNumberFirstGroup == 0){
        randomNumberFirstGroup = 1
    }  else {
        randomNumberFirstGroup = 0
    }
    if(randomNumberSecondGroup == 0){
        randomNumberSecondGroup = 1
    } else {
        randomNumberSecondGroup = 0
    }

    const matchTwoTeamOne = firstGroup[randomNumberFirstGroup]
    const matchTwoTeamTwo = secondGroup[randomNumberSecondGroup]

    const groups = Object.keys(groupsObj)
    for(const group of groups){
        if(simplifyGroups[group].includes(matchOneTeamOne) || simplifyGroups[group].includes(matchOneTeamTwo)){
            return playOffMatches(firstGroup,secondGroup)
        }
        if(simplifyGroups[group].includes(matchTwoTeamOne) || simplifyGroups[group].includes(matchTwoTeamTwo)){
            return playOffMatches(firstGroup,secondGroup)
        }
    }

    return [
        {
            match: `${matchOneTeamOne.team} - ${matchOneTeamTwo.team}`,
            FIBARanking: `${matchOneTeamOne.FIBARanking}:${matchOneTeamTwo.FIBARanking}`
        },
        {
            match: `${matchTwoTeamOne.team} - ${matchTwoTeamTwo.team}`,
            FIBARanking: `${matchTwoTeamOne.FIBARanking}:${matchTwoTeamTwo.FIBARanking}` 
        }
    ]

}

function calculateEliminatedFinalResults(matches){
    const calculatedEliminatedFinalResults = []
    for(const match of matches){
        const team1 = match.match.split(' - ')[0]
        const team2 = match.match.split(' - ')[1]
        const team1FibaR = match.FIBARanking.split(':')[0]
        const team2FibaR = match.FIBARanking.split(':')[1]

        let team1Score = 0;
        let team2Score = 0;
        while (team1Score === team2Score) {
            team1Score = calculateScore({FIBARanking: team1FibaR})
            team2Score = calculateScore({FIBARanking: team2FibaR})
        }
        
        let winner = '';
        let winnerFibaRanking = '';
        let loser = '';
        let loserFibaRanking = '';

        if (team1Score < team2Score) {
            winner = team2;
            winnerFibaRanking = team2FibaR
            loser = team1
            loserFibaRanking = team1FibaR
        } else {
            winner = team1;
            winnerFibaRanking = team1FibaR
            loser = team2
            loserFibaRanking = team2FibaR
        }

        calculatedEliminatedFinalResults.push({match: match.match, result: `(${team1Score}:${team2Score})`, winner, winnerFibaRanking,loser, loserFibaRanking })
    }

    return calculatedEliminatedFinalResults
}

function getFinalMatches(semiFinalMatchesResult){
    const finalMatch = {match: `${semiFinalMatchesResult[0].winner} - ${semiFinalMatchesResult[1].winner}`, FIBARanking: `${semiFinalMatchesResult[0].winnerFibaRanking}:${semiFinalMatchesResult[1].winnerFibaRanking}`}
    const bronzeMatch = {match: `${semiFinalMatchesResult[0].loser} - ${semiFinalMatchesResult[1].loser}`, FIBARanking: `${semiFinalMatchesResult[0].loserFibaRanking}:${semiFinalMatchesResult[1].loserFibaRanking}`}

    return [finalMatch,bronzeMatch]
}

main()



  