import mist_sdk
import time
import threading
import random
import sys

QUESTIONS = [
    {
        "question": "Qual e o maior planeta do Sistema Solar?",
        "options": ["Terra", "Marte", "Jupiter", "Venus"],
        "answer": 2,
    },
    {
        "question": "Qual linguagem e conhecida pela extensao .py?",
        "options": ["Python", "Java", "C#", "Ruby"],
        "answer": 0,
    },
    {
        "question": "Quantos lados tem um hexagono?",
        "options": ["5", "6", "7", "8"],
        "answer": 1,
    },
    {
        "question": "Qual e a capital do Brasil?",
        "options": ["Rio de Janeiro", "Sao Paulo", "Brasilia", "Salvador"],
        "answer": 2,
    },
    {
        "question": "Qual destes e um sistema operacional?",
        "options": ["Linux", "Python", "SQLite", "HTTP"],
        "answer": 0,
    },
    {
        "question": "Quanto e 12 x 8?",
        "options": ["86", "96", "108", "112"],
        "answer": 1,
    },
    {
        "question": "Qual oceano banha o litoral brasileiro?",
        "options": ["Pacifico", "Indico", "Atlantico", "Artico"],
        "answer": 2,
    },
    {
        "question": "Qual planeta e conhecido como Planeta Vermelho?",
        "options": ["Marte", "Saturno", "Mercurio", "Netuno"],
        "answer": 0,
    },
]

def start_ping_loop():
    def loop():
        while True:
            time.sleep(60)
            try:
                mist_sdk.ping()
            except Exception:
                pass

    threading.Thread(target=loop, daemon=True).start()

def main():
    try:
        session = mist_sdk.start_session()
        print("Sessao iniciada:", session.get("session_id", "ok"))
    except Exception as exc:
        print("[MIST] Aviso: nao foi possivel registrar sessao:", exc)

    start_ping_loop()

    score = 0
    streak = 0
    first_correct = False
    asked = list(QUESTIONS)
    random.shuffle(asked)

    print("\n=== MIST QUIZ ===")
    print("Digite 1-4 para responder ou Q para sair.\n")

    for number, item in enumerate(asked, 1):
        print(f"Pergunta {number}/{len(asked)}")
        print(item["question"])

        for i, option in enumerate(item["options"], 1):
            print(f"  {i}) {option}")

        while True:
            answer = input("> ").strip().lower()
            if answer == "q":
                print("Jogo encerrado.")
                return
            if answer in ("1", "2", "3", "4"):
                break
            print("Resposta invalida. Digite 1, 2, 3 ou Q.")

        if int(answer) - 1 == item["answer"]:
            score += 100
            streak += 1
            print("Correto! +100 pontos.")

            if not first_correct:
                first_correct = True
                mist_sdk.unlock_achievement("first_correct")

            if streak == 5:
                mist_sdk.unlock_achievement("five_correct_streak")
                print("Conquista: 5 respostas corretas seguidas!")
        else:
            print("Incorreto.")
            print("Resposta:", item["options"][item["answer"]])
            streak = 0

        print("Pontuacao:", score)
        print()

    max_score = len(asked) * 100
    if score == max_score:
        mist_sdk.unlock_achievement("maximum_score")
        print("Conquista: pontuacao maxima!")

    print(f"Fim do quiz! Pontuacao final: {score}/{max_score}")

if __name__ == "__main__":
    main()
