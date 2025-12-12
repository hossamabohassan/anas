import { Difficulty, Operation, Question } from '../types';

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array: number[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function generateQuestion(operation: Operation, difficulty: Difficulty): Question {
  let a = 0, b = 0, answer = 0;
  let symbol = '';
  let isMissingOperand = false;

  // 30% chance of missing operand format for Medium/Hard
  if (difficulty !== Difficulty.EASY && Math.random() > 0.7) {
    isMissingOperand = true;
  }

  switch (operation) {
    case 'multiplication':
      symbol = '×';
      if (difficulty === Difficulty.EASY) {
        a = getRandomInt(2, 5);
        b = getRandomInt(2, 5);
      } else if (difficulty === Difficulty.MEDIUM) {
        a = getRandomInt(3, 9);
        b = getRandomInt(3, 9);
      } else {
        a = getRandomInt(6, 12);
        b = getRandomInt(4, 9);
      }
      answer = a * b;
      break;

    case 'division':
      symbol = '÷';
      let divA = 0, divB = 0;
      if (difficulty === Difficulty.EASY) {
        divA = getRandomInt(2, 5);
        divB = getRandomInt(2, 5);
      } else if (difficulty === Difficulty.MEDIUM) {
        divA = getRandomInt(3, 9);
        divB = getRandomInt(3, 9);
      } else {
        divA = getRandomInt(4, 9);
        divB = getRandomInt(6, 12);
      }
      answer = divA; 
      b = divB;
      a = divA * divB; 
      break;

    case 'addition':
      symbol = '+';
      if (difficulty === Difficulty.EASY) {
        a = getRandomInt(5, 20);
        b = getRandomInt(5, 20);
      } else if (difficulty === Difficulty.MEDIUM) {
        a = getRandomInt(20, 100);
        b = getRandomInt(20, 100);
      } else {
        a = getRandomInt(100, 500);
        b = getRandomInt(100, 500);
      }
      answer = a + b;
      break;

    case 'subtraction':
      symbol = '-';
      if (difficulty === Difficulty.EASY) {
        a = getRandomInt(10, 30);
        b = getRandomInt(1, a - 1);
      } else if (difficulty === Difficulty.MEDIUM) {
        a = getRandomInt(50, 150);
        b = getRandomInt(10, a - 10);
      } else {
        a = getRandomInt(200, 1000);
        b = getRandomInt(50, a - 50);
      }
      answer = a - b;
      break;
  }

  const answers = new Set<number>();
  answers.add(answer);

  while (answers.size < 4) {
    const offset = getRandomInt(1, 10);
    const sign = Math.random() > 0.5 ? 1 : -1;
    let fake = answer + (offset * sign);
    if (fake < 0) fake = Math.abs(fake);
    if (fake === answer) fake = answer + 1;
    answers.add(fake);
  }

  const answersArray = Array.from(answers);
  shuffleArray(answersArray);

  if (isMissingOperand) {
    const hideA = Math.random() > 0.5;
    if (operation === 'division') {
         if (hideA) {
             return generateSpecificMissingQuestion(a, [], b, answer, symbol, true);
         } else {
             return generateSpecificMissingQuestion(b, [], a, answer, symbol, false);
         }
    } else {
        if (hideA) {
             return generateSpecificMissingQuestion(a, [], b, answer, symbol, true);
        } else {
             return generateSpecificMissingQuestion(b, [], a, answer, symbol, false);
        }
    }
  }

  const text = `${a} ${symbol} ${b} = ؟`;

  return {
    text,
    operandA: a,
    operandB: b,
    correctAnswer: answer,
    answers: answersArray,
    isMissingOperand: false
  };
}

function generateSpecificMissingQuestion(
    correctVal: number, 
    _unusedOriginalAnswers: number[], 
    knownVal: number, 
    resultVal: number, 
    symbol: string,
    hideFirst: boolean
): Question {
    const answers = new Set<number>();
    answers.add(correctVal);
    while(answers.size < 4) {
        let offset = getRandomInt(1, 5);
        if (correctVal > 10) offset = getRandomInt(1, 10);
        const sign = Math.random() > 0.5 ? 1 : -1;
        let fake = correctVal + (offset * sign);
        if (fake < 0) fake = 0;
        if (fake === correctVal) fake = correctVal + 1;
        answers.add(fake);
    }
    const finalAnswers = Array.from(answers);
    shuffleArray(finalAnswers);

    let text = "";
    if (hideFirst) {
        text = `؟ ${symbol} ${knownVal} = ${resultVal}`;
    } else {
        text = `${knownVal} ${symbol} ؟ = ${resultVal}`;
    }

    return {
        text,
        operandA: 0, 
        operandB: 0,
        correctAnswer: correctVal,
        answers: finalAnswers,
        isMissingOperand: true
    };
}

// New Helper Function for Educational Hints
export function getEducationalHint(q: Question): string {
    const isMult = q.text.includes('×');
    const isDiv = q.text.includes('÷');
    const isAdd = q.text.includes('+');
    const isSub = q.text.includes('-');

    if (q.isMissingOperand) {
        // Simple generic hint for missing operands as parsing specific numbers back from text is complex without storing more state
        // We can infer operations though.
        if (isMult) return `تذكر يا الوليد: (رقم) × (رقم) = الناتج. ما هو الرقم الذي إذا ضربناه يعطينا هذه النتيجة؟`;
        if (isDiv) return `تذكر: القسمة عكس الضرب. حاول تجد الرقم المفقود بالتجربة!`;
        return `في المسائل المجهولة، حاول تخمين الرقم وجربه في المعادلة لترى إن كان صحيحاً.`;
    }

    if (isMult) {
        // Extract numbers approximately or give generic logic
        return `يا بطل، الضرب هو تكرار للجمع. ${q.operandA} × ${q.operandB} تعني أن نجمع الرقم ${q.operandA}، ${q.operandB} مرات.`;
    }
    if (isDiv) {
        // Note: Logic above sets answer=divA, b=divB, a=divA*divB. 
        // Display is "a / b = answer" -> "a / b = ?"
        // q.operandA is Dividend (big number), q.operandB is Divisor.
        return `القسمة تعني التوزيع بالتساوي. لو وزعنا ${q.operandA} على ${q.operandB} أشخاص، كل واحد يأخذ ${q.correctAnswer}.`;
    }
    if (isAdd) {
        return `الجمع يعني نضم الأرقام لبعضها. ${q.operandA} ونضيف عليها ${q.operandB} يصبح المجموع ${q.correctAnswer}.`;
    }
    if (isSub) {
        return `الطرح يعني الأخذ أو النقصان. ${q.operandA} لو أخذنا منها ${q.operandB} يتبقى ${q.correctAnswer}.`;
    }
    return "حاول مرة أخرى، أنت ذكي وتستطيع حلها!";
}