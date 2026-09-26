const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const historyElement = document.getElementById("history");
const newGameButton = document.getElementById("newGame");

const whiteTimeElement = document.getElementById("whiteTime");
const blackTimeElement = document.getElementById("blackTime");

const PIECES = {
    white: {
        king: "♔",
        queen: "♕",
        rook: "♖",
        bishop: "♗",
        knight: "♘",
        pawn: "♙"
    },

    black: {
        king: "♚",
        queen: "♛",
        rook: "♜",
        bishop: "♝",
        knight: "♞",
        pawn: "♟"
    }
};

let board = [];
let currentPlayer = "white";

let selectedSquare = null;

let gameOver = false;

let moveHistory = [];

let enPassantTarget = null;

let castlingRights = {
    whiteKing: true,
    whiteQueen: true,
    blackKing: true,
    blackQueen: true
};

let clocks = {
    white: 600,
    black: 600
};

let timer = null;


// ============================
// CREATE STARTING BOARD
// ============================

function createInitialBoard() {

    board = Array.from(
        { length: 8 },
        () => Array(8).fill(null)
    );

    const backRank = [
        "rook",
        "knight",
        "bishop",
        "queen",
        "king",
        "bishop",
        "knight",
        "rook"
    ];

    for (let col = 0; col < 8; col++) {

        board[0][col] = {
            type: backRank[col],
            color: "black"
        };

        board[1][col] = {
            type: "pawn",
            color: "black"
        };

        board[6][col] = {
            type: "pawn",
            color: "white"
        };

        board[7][col] = {
            type: backRank[col],
            color: "white"
        };
    }
}


// ============================
// DRAW BOARD
// ============================

function drawBoard() {

    boardElement.innerHTML = "";

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const square = document.createElement("div");

            square.classList.add("square");

            if ((row + col) % 2 === 0) {
                square.classList.add("light");
            } else {
                square.classList.add("dark");
            }

            square.dataset.row = row;
            square.dataset.col = col;

            const piece = board[row][col];

            if (piece) {

                const pieceElement = document.createElement("span");

                pieceElement.classList.add("piece");

                if (piece.color === "white") {
                    pieceElement.classList.add("white-piece");
                } else {
                    pieceElement.classList.add("black-piece");
                }

                pieceElement.textContent =
                    PIECES[piece.color][piece.type];

                square.appendChild(pieceElement);
            }

            square.addEventListener(
                "click",
                () => handleSquareClick(row, col)
            );

            boardElement.appendChild(square);
        }
    }

    highlightCheck();
}


// ============================
// CLICK SQUARE
// ============================

function handleSquareClick(row, col) {

    if (gameOver) return;

    const piece = board[row][col];

    // Select a piece
    if (!selectedSquare) {

        if (!piece) return;

        if (piece.color !== currentPlayer) return;

        selectedSquare = { row, col };

        highlightSelected();

        return;
    }

    // Select another own piece
    if (
        piece &&
        piece.color === currentPlayer
    ) {

        selectedSquare = { row, col };

        highlightSelected();

        return;
    }

    const moves = getLegalMoves(
        selectedSquare.row,
        selectedSquare.col
    );

    const validMove = moves.some(
        move =>
            move.row === row &&
            move.col === col
    );

    if (!validMove) {

        selectedSquare = null;

        drawBoard();

        return;
    }

    makeMove(
        selectedSquare.row,
        selectedSquare.col,
        row,
        col
    );

    selectedSquare = null;
}


// ============================
// HIGHLIGHT SELECTED PIECE
// ============================

function highlightSelected() {

    drawBoard();

    if (!selectedSquare) return;

    const squares =
        document.querySelectorAll(".square");

    const index =
        selectedSquare.row * 8 +
        selectedSquare.col;

    squares[index].classList.add("selected");

    const moves = getLegalMoves(
        selectedSquare.row,
        selectedSquare.col
    );

    moves.forEach(move => {

        const index =
            move.row * 8 +
            move.col;

        const target = squares[index];

        if (board[move.row][move.col]) {
            target.classList.add("capture");
        } else {
            target.classList.add("legal");
        }
    });
}


// ============================
// GET LEGAL MOVES
// ============================

function getLegalMoves(row, col) {

    const piece = board[row][col];

    if (!piece) return [];

    const pseudoMoves =
        getPseudoMoves(row, col, board);

    const legalMoves = [];

    for (const move of pseudoMoves) {

        const simulatedBoard =
            copyBoard(board);

        movePieceOnBoard(
            simulatedBoard,
            row,
            col,
            move.row,
            move.col,
            move
        );

        if (
            !isKingInCheck(
                simulatedBoard,
                piece.color
            )
        ) {
            legalMoves.push(move);
        }
    }

    return legalMoves;
}


// ============================
// PIECE MOVEMENT
// ============================

function getPseudoMoves(row, col, position) {

    const piece = position[row][col];

    if (!piece) return [];

    const moves = [];

    const add = (r, c, extra = {}) => {

        if (
            r < 0 ||
            r > 7 ||
            c < 0 ||
            c > 7
        ) return;

        const target = position[r][c];

        if (!target) {

            moves.push({
                row: r,
                col: c,
                ...extra
            });

        } else if (
            target.color !== piece.color &&
            target.type !== "king"
        ) {

            moves.push({
                row: r,
                col: c,
                ...extra
            });
        }
    };

    // PAWN
    if (piece.type === "pawn") {

        const direction =
            piece.color === "white" ? -1 : 1;

        const startRow =
            piece.color === "white" ? 6 : 1;

        const oneRow = row + direction;

        if (
            oneRow >= 0 &&
            oneRow <= 7 &&
            !position[oneRow][col]
        ) {

            moves.push({
                row: oneRow,
                col
            });

            const twoRow =
                row + direction * 2;

            if (
                row === startRow &&
                !position[twoRow][col]
            ) {

                moves.push({
                    row: twoRow,
                    col
                });
            }
        }

        for (const dc of [-1, 1]) {

            const captureCol = col + dc;

            if (
                captureCol < 0 ||
                captureCol > 7
            ) continue;

            const target =
                position[oneRow]?.[captureCol];

            if (
                target &&
                target.color !== piece.color &&
                target.type !== "king"
            ) {

                moves.push({
                    row: oneRow,
                    col: captureCol
                });
            }

            if (
                enPassantTarget &&
                enPassantTarget.row === oneRow &&
                enPassantTarget.col === captureCol
            ) {

                moves.push({
                    row: oneRow,
                    col: captureCol,
                    enPassant: true
                });
            }
        }
    }


    // KNIGHT
    if (piece.type === "knight") {

        const jumps = [
            [-2, -1],
            [-2, 1],
            [-1, -2],
            [-1, 2],
            [1, -2],
            [1, 2],
            [2, -1],
            [2, 1]
        ];

        jumps.forEach(([dr, dc]) => {

            add(row + dr, col + dc);
        });
    }


    // KING
    if (piece.type === "king") {

        for (let dr = -1; dr <= 1; dr++) {

            for (let dc = -1; dc <= 1; dc++) {

                if (dr === 0 && dc === 0) continue;

                add(row + dr, col + dc);
            }
        }

        // Castling
        if (
            !isKingInCheck(
                position,
                piece.color
            )
        ) {

            const kingSide =
                piece.color === "white"
                    ? castlingRights.whiteKing
                    : castlingRights.blackKing;

            const queenSide =
                piece.color === "white"
                    ? castlingRights.whiteQueen
                    : castlingRights.blackQueen;

            const backRow =
                piece.color === "white" ? 7 : 0;

            // King side
            if (
                kingSide &&
                position[backRow][5] === null &&
                position[backRow][6] === null &&
                position[backRow][7]?.type === "rook" &&
                position[backRow][7]?.color === piece.color &&
                !squareAttacked(
                    position,
                    backRow,
                    5,
                    opposite(piece.color)
                ) &&
                !squareAttacked(
                    position,
                    backRow,
                    6,
                    opposite(piece.color)
                )
            ) {

                moves.push({
                    row: backRow,
                    col: 6,
                    castle: "king"
                });
            }

            // Queen side
            if (
                queenSide &&
                position[backRow][1] === null &&
                position[backRow][2] === null &&
                position[backRow][3] === null &&
                position[backRow][0]?.type === "rook" &&
                position[backRow][0]?.color === piece.color &&
                !squareAttacked(
                    position,
                    backRow,
                    3,
                    opposite(piece.color)
                ) &&
                !squareAttacked(
                    position,
                    backRow,
                    2,
                    opposite(piece.color)
                )
            ) {

                moves.push({
                    row: backRow,
                    col: 2,
                    castle: "queen"
                });
            }
        }
    }


    // ROOK
    if (piece.type === "rook") {

        addSlidingMoves(
            row,
            col,
            position,
            [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1]
            ],
            moves
        );
    }


    // BISHOP
    if (piece.type === "bishop") {

        addSlidingMoves(
            row,
            col,
            position,
            [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1]
            ],
            moves
        );
    }


    // QUEEN
    if (piece.type === "queen") {

        addSlidingMoves(
            row,
            col,
            position,
            [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1]
            ],
            moves
        );
    }

    return moves;
}


// ============================
// SLIDING PIECES
// ============================

function addSlidingMoves(
    row,
    col,
    position,
    directions,
    moves
) {

    const piece = position[row][col];

    for (const [dr, dc] of directions) {

        let r = row + dr;
        let c = col + dc;

        while (
            r >= 0 &&
            r < 8 &&
            c >= 0 &&
            c < 8
        ) {

            const target = position[r][c];

            if (!target) {

                moves.push({
                    row: r,
                    col: c
                });

            } else {

                if (
                    target.color !== piece.color &&
                    target.type !== "king"
                ) {

                    moves.push({
                        row: r,
                        col: c
                    });
                }

                break;
            }

            r += dr;
            c += dc;
        }
    }
}


// ============================
// MAKE MOVE
// ============================

function makeMove(
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    const piece = board[fromRow][fromCol];

    const moves =
        getLegalMoves(fromRow, fromCol);

    const move = moves.find(
        m =>
            m.row === toRow &&
            m.col === toCol
    );

    if (!move) return;

    const captured =
        board[toRow][toCol];

    const fromName =
        squareName(fromRow, fromCol);

    const toName =
        squareName(toRow, toCol);

    // En passant capture
    if (move.enPassant) {

        const capturedRow =
            piece.color === "white"
                ? toRow + 1
                : toRow - 1;

        board[capturedRow][toCol] = null;
    }

    board[toRow][toCol] = piece;

    board[fromRow][fromCol] = null;


    // Castling
    if (move.castle === "king") {

        board[toRow][5] =
            board[toRow][7];

        board[toRow][7] = null;
    }

    if (move.castle === "queen") {

        board[toRow][3] =
            board[toRow][0];

        board[toRow][0] = null;
    }


    // Update castling rights
    updateCastlingRights(
        piece,
        fromRow,
        fromCol,
        toRow,
        toCol
    );


    // En passant target
    enPassantTarget = null;

    if (
        piece.type === "pawn" &&
        Math.abs(toRow - fromRow) === 2
    ) {

        enPassantTarget = {
            row: (fromRow + toRow) / 2,
            col: fromCol
        };
    }


    // Promotion
    if (
        piece.type === "pawn" &&
        (toRow === 0 || toRow === 7)
    ) {

        const choice =
            prompt(
                "Promote pawn to: queen, rook, bishop, or knight",
                "queen"
            );

        const validChoices = [
            "queen",
            "rook",
            "bishop",
            "knight"
        ];

        piece.type =
            validChoices.includes(
                choice?.toLowerCase()
            )
                ? choice.toLowerCase()
                : "queen";
    }


    // Record move
    moveHistory.push({
        color: piece.color,
        from: fromName,
        to: toName,
        captured: captured
            ? captured.type
            : null
    });

    currentPlayer =
        opposite(currentPlayer);

    updateHistory();

    drawBoard();

    checkGameState();
}


// ============================
// CASTLING RIGHTS
// ============================

function updateCastlingRights(
    piece,
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    if (piece.type === "king") {

        if (piece.color === "white") {

            castlingRights.whiteKing = false;
            castlingRights.whiteQueen = false;

        } else {

            castlingRights.blackKing = false;
            castlingRights.blackQueen = false;
        }
    }

    if (piece.type === "rook") {

        if (
            piece.color === "white" &&
            fromRow === 7 &&
            fromCol === 0
        ) {
            castlingRights.whiteQueen = false;
        }

        if (
            piece.color === "white" &&
            fromRow === 7 &&
            fromCol === 7
        ) {
            castlingRights.whiteKing = false;
        }

        if (
            piece.color === "black" &&
            fromRow === 0 &&
            fromCol === 0
        ) {
            castlingRights.blackQueen = false;
        }

        if (
            piece.color === "black" &&
            fromRow === 0 &&
            fromCol === 7
        ) {
            castlingRights.blackKing = false;
        }
    }

    // Capturing a rook
    if (toRow === 7 && toCol === 0)
        castlingRights.whiteQueen = false;

    if (toRow === 7 && toCol === 7)
        castlingRights.whiteKing = false;

    if (toRow === 0 && toCol === 0)
        castlingRights.blackQueen = false;

    if (toRow === 0 && toCol === 7)
        castlingRights.blackKing = false;
}


// ============================
// KING CHECK
// ============================

function isKingInCheck(
    position,
    color
) {

    let king = null;

    for (let r = 0; r < 8; r++) {

        for (let c = 0; c < 8; c++) {

            const piece = position[r][c];

            if (
                piece &&
                piece.color === color &&
                piece.type === "king"
            ) {

                king = {
                    row: r,
                    col: c
                };
            }
        }
    }

    if (!king) return true;

    return squareAttacked(
        position,
        king.row,
        king.col,
        opposite(color)
    );
}


// ============================
// SQUARE ATTACKED
// ============================

function squareAttacked(
    position,
    row,
    col,
    attackerColor
) {

    for (let r = 0; r < 8; r++) {

        for (let c = 0; c < 8; c++) {

            const piece = position[r][c];

            if (
                !piece ||
                piece.color !== attackerColor
            ) continue;

            if (
                pieceAttacksSquare(
                    position,
                    r,
                    c,
                    row,
                    col
                )
            ) {
                return true;
            }
        }
    }

    return false;
}


// ============================
// PIECE ATTACK LOGIC
// ============================

function pieceAttacksSquare(
    position,
    r,
    c,
    targetR,
    targetC
) {

    const piece = position[r][c];

    const dr = targetR - r;
    const dc = targetC - c;

    if (piece.type === "pawn") {

        const direction =
            piece.color === "white" ? -1 : 1;

        return (
            dr === direction &&
            Math.abs(dc) === 1
        );
    }

    if (piece.type === "knight") {

        return (
            Math.abs(dr) === 2 &&
            Math.abs(dc) === 1
        ) ||
        (
            Math.abs(dr) === 1 &&
            Math.abs(dc) === 2
        );
    }

    if (piece.type === "king") {

        return (
            Math.abs(dr) <= 1 &&
            Math.abs(dc) <= 1
        );
    }

    let validDirection = false;

    if (piece.type === "rook") {

        validDirection =
            dr === 0 ||
            dc === 0;
    }

    if (piece.type === "bishop") {

        validDirection =
            Math.abs(dr) === Math.abs(dc);
    }

    if (piece.type === "queen") {

        validDirection =
            dr === 0 ||
            dc === 0 ||
            Math.abs(dr) === Math.abs(dc);
    }

    if (!validDirection) return false;

    const stepR = Math.sign(dr);
    const stepC = Math.sign(dc);

    let currentR = r + stepR;
    let currentC = c + stepC;

    while (
        currentR !== targetR ||
        currentC !== targetC
    ) {

        if (position[currentR][currentC]) {
            return false;
        }

        currentR += stepR;
        currentC += stepC;
    }

    return true;
}


// ============================
// COPY BOARD
// ============================

function copyBoard(position) {

    return position.map(
        row =>
            row.map(
                piece =>
                    piece
                        ? { ...piece }
                        : null
            )
    );
}


// ============================
// SIMULATE MOVE
// ============================

function movePieceOnBoard(
    position,
    fromRow,
    fromCol,
    toRow,
    toCol,
    move
) {

    const piece =
        position[fromRow][fromCol];

    position[toRow][toCol] = {
        ...piece
    };

    position[fromRow][fromCol] = null;

    if (move.enPassant) {

        const capturedRow =
            piece.color === "white"
                ? toRow + 1
                : toRow - 1;

        position[capturedRow][toCol] = null;
    }

    if (move.castle === "king") {

        position[toRow][5] =
            position[toRow][7];

        position[toRow][7] = null;
    }

    if (move.castle === "queen") {

        position[toRow][3] =
            position[toRow][0];

        position[toRow][0] = null;
    }
}


// ============================
// CHECK GAME STATE
// ============================

function checkGameState() {

    const inCheck =
        isKingInCheck(
            board,
            currentPlayer
        );

    let hasMove = false;

    for (let r = 0; r < 8; r++) {

        for (let c = 0; c < 8; c++) {

            const piece = board[r][c];

            if (
                piece &&
                piece.color === currentPlayer
            ) {

                if (
                    getLegalMoves(r, c).length > 0
                ) {

                    hasMove = true;
                    break;
                }
            }
        }

        if (hasMove) break;
    }


    if (!hasMove && inCheck) {

        gameOver = true;

        const winner =
            currentPlayer === "white"
                ? "Black"
                : "White";

        statusElement.textContent =
            `♚ Checkmate! ${winner} wins!`;

        stopTimer();

        return;
    }


    if (!hasMove && !inCheck) {

        gameOver = true;

        statusElement.textContent =
            "🤝 Stalemate! Draw.";

        stopTimer();

        return;
    }


    if (inCheck) {

        statusElement.textContent =
            `⚠️ ${capitalize(currentPlayer)} is in check!`;

    } else {

        statusElement.textContent =
            `${capitalize(currentPlayer)}'s turn`;
    }
}


// ============================
// HIGHLIGHT CHECK
// ============================

function highlightCheck() {

    const squares =
        document.querySelectorAll(".square");

    if (!isKingInCheck(board, "white") &&
        !isKingInCheck(board, "black")) {
        return;
    }

    const checkedColor =
        isKingInCheck(board, "white")
            ? "white"
            : "black";

    for (let r = 0; r < 8; r++) {

        for (let c = 0; c < 8; c++) {

            const piece = board[r][c];

            if (
                piece &&
                piece.color === checkedColor &&
                piece.type === "king"
            ) {

                squares[
                    r * 8 + c
                ].classList.add("check");
            }
        }
    }
}


// ============================
// MOVE HISTORY
// ============================

function updateHistory() {

    if (moveHistory.length === 0) {

        historyElement.textContent =
            "No moves yet";

        return;
    }

    historyElement.innerHTML = "";

    for (
        let i = 0;
        i < moveHistory.length;
        i += 2
    ) {

        const whiteMove =
            moveHistory[i];

        const blackMove =
            moveHistory[i + 1];

        const line =
            document.createElement("div");

        line.innerHTML =
            `<strong>${Math.floor(i / 2) + 1}.</strong>
             ${whiteMove?.from || ""} → ${whiteMove?.to || ""}
             &nbsp;&nbsp;
             ${blackMove?.from || ""} → ${blackMove?.to || ""}`;

        historyElement.appendChild(line);
    }

    historyElement.scrollTop =
        historyElement.scrollHeight;
}


// ============================
// TIMER
// ============================

function startTimer() {

    stopTimer();

    timer = setInterval(() => {

        if (gameOver) return;

        clocks[currentPlayer]--;

        updateClockDisplay();

        if (clocks[currentPlayer] <= 0) {

            gameOver = true;

            const winner =
                currentPlayer === "white"
                    ? "Black"
                    : "White";

            statusElement.textContent =
                `⏰ Time out! ${winner} wins!`;

            stopTimer();
        }

    }, 1000);
}


function stopTimer() {

    if (timer) {

        clearInterval(timer);

        timer = null;
    }
}


function updateClockDisplay() {

    whiteTimeElement.textContent =
        formatTime(clocks.white);

    blackTimeElement.textContent =
        formatTime(clocks.black);
}


function formatTime(seconds) {

    seconds = Math.max(0, seconds);

    const minutes =
        Math.floor(seconds / 60);

    const remaining =
        seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remaining).padStart(2, "0")
    );
}


// ============================
// NEW GAME
// ============================

function newGame() {

    stopTimer();

    currentPlayer = "white";

    selectedSquare = null;

    gameOver = false;

    moveHistory = [];

    enPassantTarget = null;

    castlingRights = {
        whiteKing: true,
        whiteQueen: true,
        blackKing: true,
        blackQueen: true
    };

    clocks = {
        white: 600,
        black: 600
    };

    createInitialBoard();

    updateHistory();

    updateClockDisplay();

    drawBoard();

    statusElement.textContent =
        "White's turn";

    startTimer();
}


newGameButton.addEventListener(
    "click",
    newGame
);


// ============================
// HELPERS
// ============================

function opposite(color) {

    return color === "white"
        ? "black"
        : "white";
}


function capitalize(text) {

    return text.charAt(0).toUpperCase() +
           text.slice(1);
}


function squareName(row, col) {

    const files = "abcdefgh";

    return (
        files[col] +
        (8 - row)
    );
}


// ============================
// START GAME
// ============================

newGame();
