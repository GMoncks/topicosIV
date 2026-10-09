import mist_sdk
import time
import threading
import os

MAZE = [
    "###############",
    "#S#     #     #",
    "# # ### # ### #",
    "# # #   #   # #",
    "#   # ##### # #",
    "### #       # #",
    "#   ##### ### #",
    "# #       #   #",
    "# ####### # ###",
    "#       # #   #",
    "# ##### # ### #",
    "#     #       #",
    "##### ####### #",
    "#           E #",
    "###############",
]

START = (1, 1)
EXIT = (13, 11)
ITEMS = {(1, 5), (3, 9), (7, 7), (11, 5)}

def start_ping_loop():
    def loop():
        while True:
            time.sleep(60)
            try:
                mist_sdk.ping()
            except Exception:
                pass

    threading.Thread(target=loop, daemon=True).start()

def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")

def draw(player, items):
    clear_screen()
    print("=== MIST LABIRINTO ===")
    print("Use W/A/S/D + Enter para mover.")
    print("Colete * e chegue ao E. Digite Q para sair.\n")

    for r, row in enumerate(MAZE):
        line = []
        for c, cell in enumerate(row):
            pos = (r, c)
            if pos == player:
                line.append("@")
            elif pos in items:
                line.append("*")
            else:
                line.append(cell)
        print("".join(line))

    print("\nItens restantes:", len(items))

def can_move(row, col):
    return (
        0 <= row < len(MAZE)
        and 0 <= col < len(MAZE[0])
        and MAZE[row][col] != "#"
    )

def main():
    try:
        session = mist_sdk.start_session()
        print("Sessao iniciada:", session.get("session_id", "ok"))
    except Exception as exc:
        print("[MIST] Aviso: nao foi possivel registrar sessao:", exc)

    start_ping_loop()

    player = START
    items = set(ITEMS)
    score = 0
    record = 0
    moved = False

    while True:
        draw(player, items)

        if player in items:
            items.remove(player)
            score += 100
            print("\nItem coletado! +100 pontos.")

            if not items:
                mist_sdk.unlock_achievement("all_items")
                print("Conquista: coletou todos os itens!")

        if player == EXIT:
            mist_sdk.unlock_achievement("reached_end")
            print("\nConquista: chegou ao fim!")

            if score > record:
                record = score
                mist_sdk.unlock_achievement("score_record")
                print("Conquista: recorde de pontos!")

            print(f"Pontuacao final: {score}")
            break

        command = input("\nMovimento: ").strip().lower()
        if command == "q":
            print("Jogo encerrado.")
            break

        moves = {
            "w": (-1, 0),
            "s": (1, 0),
            "a": (0, -1),
            "d": (0, 1),
        }

        if command not in moves:
            print("Comando invalido.")
            continue

        dr, dc = moves[command]
        nr, nc = player[0] + dr, player[1] + dc

        if can_move(nr, nc):
            player = (nr, nc)
            if not moved:
                moved = True
                mist_sdk.unlock_achievement("first_move")
        else:
            print("Parede!")

    print("\nObrigado por jogar!")

if __name__ == "__main__":
    main()
