import mist_sdk
import time
import threading
import random
import string

WORDS = [
    "python", "terminal", "algoritmo", "computador",
    "internet", "programacao", "sistema", "servidor",
    "teclado", "arquivo", "memoria", "desenvolvedor",
]

HANGMAN = [
    """
     +---+
     |   |
         |
         |
         |
    =======
    """,
    """
     +---+
     |   |
     O   |
         |
         |
    =======
    """,
    """
     +---+
     |   |
     O   |
     |   |
         |
    =======
    """,
    """
     +---+
     |   |
     O   |
    /|   |
         |
    =======
    """,
    """
     +---+
     |   |
     O   |
    /|\\  |
         |
    =======
    """,
    """
     +---+
     |   |
     O   |
    /|\\  |
    /    |
    =======
    """,
    """
     +---+
     |   |
     O   |
    /|\\  |
    / \\  |
    =======
    """,
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

def draw_word(word, guessed):
    return " ".join(c if c in guessed else "_" for c in word)

def play_word(word):
    guessed = set()
    wrong = set()
    mistakes = 0

    while mistakes < 6:
        print(HANGMAN[mistakes])
        print("Palavra:", draw_word(word, guessed))
        print("Letras erradas:", " ".join(sorted(wrong)) or "-")
        print("Erros restantes:", 6 - mistakes)

        if all(c in guessed for c in word):
            return True, mistakes

        letter = input("Digite uma letra (ou 0 para sair): ").strip().lower()

        if letter == "0":
            return None, mistakes

        if len(letter) != 1 or letter not in string.ascii_lowercase:
            print("Digite apenas uma letra.")
            continue

        if letter in guessed or letter in wrong:
            print("Essa letra ja foi usada.")
            continue

        if letter in word:
            guessed.add(letter)
            print("Acertou!")
        else:
            wrong.add(letter)
            mistakes += 1
            print("Errou!")

    print(HANGMAN[6])
    print("A palavra era:", word)
    return False, mistakes

def main():
    try:
        session = mist_sdk.start_session()
        print("Sessao iniciada:", session.get("session_id", "ok"))
    except Exception as exc:
        print("[MIST] Aviso: nao foi possivel registrar sessao:", exc)

    start_ping_loop()

    print("\n=== MIST FORCA ===")
    print("Descubra as palavras antes de ficar sem tentativas.\n")

    words = WORDS[:]
    random.shuffle(words)

    solved_count = 0
    flawless_streak = 0
    first_word_unlocked = False

    for word in words:
        solved, mistakes = play_word(word)

        if solved is None:
            print("Jogo encerrado.")
            return

        if solved:
            solved_count += 1

            if not first_word_unlocked:
                first_word_unlocked = True
                mist_sdk.unlock_achievement("first_word")

            if mistakes == 0:
                mist_sdk.unlock_achievement("no_mistakes")

            if mistakes == 0:
                flawless_streak += 1
            else:
                flawless_streak = 0

            if solved_count >= 3:
                mist_sdk.unlock_achievement("three_words")
                print("Conquista: 3 palavras descobertas!")

            if flawless_streak >= 3:
                mist_sdk.unlock_achievement("three_flawless")
                print("Conquista: 3 palavras sem erros!")

        print()

        if solved_count >= 3:
            again = input("Jogar outra palavra? [S/N] ").strip().lower()
            if again != "s":
                break
        else:
            again = input("Continuar? [S/N] ").strip().lower()
            if again != "s":
                break

    print(f"\nFim do jogo! Palavras descobertas: {solved_count}")

if __name__ == "__main__":
    main()
