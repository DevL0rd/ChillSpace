# Chillspace (WIP)
A open source media sharing and hangout website. Built on my open source web server.
If you want to contribute, this project is completely open source. Go ahead, break things!
You can hang out with us at http://delv0rd.com!
## Installation and configuration
Chillspace requires [Node.js](https://nodejs.org/) v4+, and the modular web server which you can download [here](https://github.com/DevL0rd/Modular-Web-Server).
- Download the server and extract.
- Install the dependencies for the WebServer.
    ```sh
    cd Modular-Web-Server
    npm install --save
     ```
- Extract Chillspace next to the WebServer folder.
- Install the dependencies for the Bot.
    ```sh
    cd Chillspace
    npm install --save
     ```
- Create a file named ChillspaceServer.bat with the following script
    ```sh
    cd Modular-Web-Server
    node Server.js ../Chillspace
    ```
- Run the server with ChillspaceServer.bat to generate the Config.json file.
- Other optional configuration can be done in the config file. The configuration is pretty straight forward so I'll skip documenting that here.
