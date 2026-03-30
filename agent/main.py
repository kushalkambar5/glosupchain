# from db.init_db import init_db

# def main():
#     print("Hello from agent!")

# if __name__ == "__main__":
#     init_db()   # first ensure DB
#     main()      # then run app


from db.init_db import init_db
from tools.shipway_tool import app   # <-- THIS is your compiled workflow

def main():
    print("Running Shipway pipeline...")

    initial_state = {
        "news": None,
        "supply_chain_news_ids": [],
        "results": {},
        "keywords": []
    }

    result = app.invoke(initial_state)

    print("Final Output:")
    print(result)


if __name__ == "__main__":
    init_db()   # optional (only for dev)
    main()


# from db.init_db import init_db
# from tools.weather_tool import app

# def main():
#     print("Running Weather pipeline...")

#     initial_state = {
#         "results": {}
#     }

#     result = app.invoke(initial_state)

#     print("Final Output:")
#     print(result)


# if __name__ == "__main__":
#     init_db()   # optional (only for dev)
#     main()