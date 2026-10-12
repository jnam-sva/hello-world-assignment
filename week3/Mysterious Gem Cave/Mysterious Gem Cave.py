# Describing player

player = {
    "name": "p1",
    "score": 0,
    "items": [],
}

locations = {
    "location1" : "a cave entrance",
    "location2" : "a colorful path",
    "location3" : "a clear path",
    "location4" : "a dark path"
}

def printGraphic(name):
    if name == "opal":
        print(r'        .-""""-.        ')
        print(r'      ."  *  ✦  ".      ')
        print(r'     / ✧  *  ✦    \     ')
        print(r'    / *  ✦  *  ✧   \    ')
        print(r'   | ✦   *   ✧   *  |   ')
        print(r'   |  *   OPAL   ✦  |   ')
        print(r'    \ ✧  *  ✦  ✧   /    ')
        print(r'     ".  ✦   *   ."     ')
        print(r'       "-.____.-"       ')
        print(r'                        ')
        print(r'         the opal       ')

    elif name == "diamond":
        print(r'          /\            ')
        print(r'         /  \           ')
        print(r'        / /\ \          ')
        print(r'       / /  \ \         ')
        print(r'      /_/____\_\        ')
        print(r'      \ \    / /        ')
        print(r'       \ \  / /         ')
        print(r'        \ \/ /          ')
        print(r'         \  /           ')
        print(r'          \/            ')
        print(r'                        ')
        print(r'       the diamond      ')

    elif name == "labradorite":
        print(r'      .----------.       ')
        print(r'    ."  ~ ✦ ~ ✧   ".     ')
        print(r'   / ~~~  ✧  ~~~    \    ')
        print(r'  /  ✦  ~~~~~  ✦     \   ')
        print(r' | ~~  LABRADORITE ~~|   ')
        print(r' |  ✧  ~~~ ✦ ~~~   ✧ |   ')
        print(r'  \   ~ ✦ ~~~ ✧ ~   /    ')
        print(r'   ".   ~~~ ✦ ~~  ."     ')
        print(r'     "-.______.-"        ')
        print(r'                         ')
        print(r'     the labradorite     ')

    elif name == "creature_appeared":
        print(r'        /\____/\          ')
        print(r'       /  o  o  \         ')
        print(r'      |    ~~    |        ')
        print(r'      |   /^^\   |        ')
        print(r'       \  \__/  /         ')
        print(r'        "-.__.-"          ')
        print(r'          /||\            ')
        print(r'      ___/ || \___        ')
        print(r'     /     ||     \       ')
        print(r'    /______||______\      ')
        print(r'          /  \            ')
        print(r'         /____\           ')
        print(r'                          ')
        print(r'  the creature appeared   ')

    elif name == "creature_defeated":
        print(r'        /\____/\          ')
        print(r'       /  x  x  \         ')
        print(r'      |    ~~    |        ')
        print(r'       \  ____  /         ')
        print(r'        "-.__.-"          ')
        print(r'          /||\            ')
        print(r'      ___/ || \___        ')
        print(r'     /     ||     \       ')
        print(r'    /______||______\      ')
        print(r'          _/\_            ')
        print(r'                          ')
        print(r'   the creature defeated  ')

    elif name == "cave_entrance":
        print(r'             _________             ')
        print(r'          .-"         "-.          ')
        print(r'        ."               ".        ')
        print(r'       /      /\   /\      \       ')
        print(r'      /      /  \_/  \      \      ')
        print(r'     /      /       . \      \     ')
        print(r'    |      /    .      \      |    ')
        print(r'    |     /    _____     \     |   ')
        print(r'    |    /   ."     ".    \    |   ')
        print(r'    |   /   /   ...   \    \   |   ')
        print(r'    |  /   |   .....   |    \  |   ')
        print(r'    |_/____|___________|_____\_|   ')
        print(r'          /             \          ')
        print(r'         /               \         ')
        print(r'                                   ')
        print(r'          the cave entrance        ')



def gameOver():
    print("name:", player["name"])
    pause()
    print("Game Over! Your final score is:", player["score"])
    exit()

def caveEntrance():
    printGraphic("cave_entrance")
    print("You are at the cave entrance. You see a dark path leading into the cave.")
    pause()
    print("What would you like to do?")
    print("1. Enter the cave")
    print("2. Leave the cave")
    choice = input("> ")
    if choice == "1":
        threePaths()

    elif choice == "2":
        print("You leave the cave and go back to safety.")
        gameOver()

    else:
        print("Invalid choice. Please try again.")
        caveEntrance()


def threePaths():
    print("You are now inside the cave. You see three paths ahead of you:")
    print("1. A colorful path")
    print("2. A clear path")
    print("3. A dark path")
    print("4. Leave the cave")
    choice = input("> ")
    if choice == "1":
        colorfulPath()

    elif choice == "2":
        clearPath()

    elif choice == "3":
        darkPath()

    elif choice == "4":
        print("You leave the cave.")
        gameOver()

    else:
        print("Invalid choice. Please try again.")
        threePaths()


def colorfulPath():
    print("You walk down the colorful path.")
    pause()
    print("Something shiny catches your eye...")
    pause()
    print("You found an opal!")
    printGraphic("opal")
    player["items"].append("opal")
    player["score"] = player["score"] + 20
    pause()
    print("Your score is now:", player["score"])
    checkWinCondition()


def clearPath():
    print("You walk down the clear path.")
    pause()
    print("You see a bridge. Do you want to cross it?")
    print("1. Yes")
    print("2. No")
    choice = input("> ")
    if choice == "1":
        print("You keep walking...")
        pause()
        print("There's something shiny on the ground.")
        pause()
        print("You found a diamond!")
        printGraphic("diamond")
        player["items"].append("diamond")
        player["score"] = player["score"] + 50
        pause()
        print("Your score is now:", player["score"])
        checkWinCondition()

    elif choice == "2":
        print("You decide not to cross the bridge and turn back.")
        pause()
        threePaths()


def darkPath():
    print("You walk down the dark path.")
    pause()
    print("It's very dark and you can't see anything.")
    pause()
    print("Suddenly, you hear a noise behind you...")
    pause()
    print("A wild creature appears! You have to fight it!")
    printGraphic("creature_appeared")
    pause()
    print("Do you want to fight or run?")
    print("1. Fight")
    print("2. Run")
    choice = input("> ")
    if choice == "1":
        print("You bravely fight the creature...")
        pause()
        printGraphic("creature_defeated")
        pause()
        print("You defeated it!")
        pause()
        print("You found a labradorite!")
        printGraphic("labradorite")
        player["items"].append("labradorite")
        player["score"] = player["score"] + 30
        pause()
        print("Your score is now:", player["score"])
        checkWinCondition()

    elif choice == "2":
        print("You run away from the creature and go back to the cave entrance.")
        pause()
        caveEntrance()


def checkWinCondition():
    if "opal" in player["items"] and "diamond" in player["items"] and "labradorite" in player["items"]:
        print("Congratulations! You have collected all the gems!")
        print("Your final score is:", player["score"])
        exit()

    else:
        print("You still have more gems to collect. Keep exploring the cave!")
        pause()
        threePaths()

def pause():
    input("Press Enter to continue...")

caveEntrance()
