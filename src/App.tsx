import React, { useCallback } from "react";
import "./styles.css";

function CanvasTable({
  size,
  data,
  onUpdateItem,
}: {
  size: number;
  data: { startingPosition: number; size: number }[];
  onUpdateItem: (
    index: number,
    updatedItem: { startingPosition: number; size: number }
  ) => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [draggingItem, setDraggingItem] = React.useState<null | {
    index: number;
    type: "start" | "end" | "move";
  }>(null);
  const [dragOffset, setDragOffset] = React.useState<null | number>(null);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const cellWidth = 80;
      const cellHeight = 30;
      const cols = 8;

      const clickedPosition =
        Math.floor(y / cellHeight) * cols + Math.floor(x / cellWidth);

      let isResizing = false;

      data.forEach((item, index) => {
        const startBorder = item.startingPosition;
        const endBorder = item.startingPosition + item.size - 1;

        if (
          clickedPosition === startBorder &&
          x % cellWidth <= 10 // Inner 10px area of the left border
        ) {
          setDraggingItem({ index, type: "start" });
          isResizing = true;
        } else if (
          clickedPosition === endBorder &&
          cellWidth - (x % cellWidth) <= 10 // Inner 10px area of the right border
        ) {
          setDraggingItem({ index, type: "end" });
          isResizing = true;
        }
      });

      if (!isResizing) {
        data.forEach((item, index) => {
          if (
            clickedPosition >= item.startingPosition &&
            clickedPosition < item.startingPosition + item.size
          ) {
            setDraggingItem({ index, type: "move" });
            setDragOffset(clickedPosition - item.startingPosition); // Store the offset
          }
        });
      }
    },
    [data]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const cellWidth = 80;
      const cellHeight = 30;
      const cols = 8;

      const hoveredPosition =
        Math.floor(y / cellHeight) * cols + Math.floor(x / cellWidth);

      let isOnBorder = false;
      let isOnItem = false;

      data.forEach((item) => {
        const startBorder = item.startingPosition;
        const endBorder = item.startingPosition + item.size - 1;

        if (
          (hoveredPosition === startBorder && x % cellWidth <= 10) || // Inner 10px of left border
          (hoveredPosition === endBorder && cellWidth - (x % cellWidth) <= 10) // Inner 10px of right border
        ) {
          isOnBorder = true;
        } else if (
          hoveredPosition >= item.startingPosition &&
          hoveredPosition < item.startingPosition + item.size
        ) {
          isOnItem = true;
        }
      });

      if (isOnBorder) {
        canvas.style.cursor = "ew-resize";
      } else if (isOnItem) {
        canvas.style.cursor = "move";
      } else {
        canvas.style.cursor = "default";
      }

      if (!draggingItem) return;

      const { index, type } = draggingItem;
      const item = data[index];

      if (type === "move") {
        const newPosition = hoveredPosition - (dragOffset ?? 0); // Use the stored offset
        if (newPosition !== item.startingPosition) {
          onUpdateItem(index, {
            startingPosition: newPosition,
            size: item.size,
          });
        }
      } else if (
        type === "start" &&
        hoveredPosition < item.startingPosition + item.size - 1
      ) {
        onUpdateItem(index, {
          startingPosition: hoveredPosition,
          size: item.size + (item.startingPosition - hoveredPosition),
        });
      } else if (type === "end" && hoveredPosition > item.startingPosition) {
        onUpdateItem(index, {
          startingPosition: item.startingPosition,
          size: hoveredPosition - item.startingPosition + 1,
        });
      }
    },
    [data, draggingItem, dragOffset, onUpdateItem]
  );

  const handleMouseUp = () => {
    setDraggingItem(null);
    setDragOffset(null); // Reset the offset
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);

      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingItem, data, handleMouseDown, handleMouseMove]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const cellWidth = 80;
        const cellHeight = 30;
        const cols = 8; // Fixed number of columns
        const rows = Math.ceil(size / cols);
        const rowMargin = 4; // Vertical margin for each row
        const cellMargin = 4; // Left and right margins for cells

        canvas.width = cols * cellWidth;
        canvas.height = rows * cellHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid with dynamic borders
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            const x = j * cellWidth;
            const y = i * cellHeight;

            ctx.beginPath();

            // Top border
            if (i === 0) {
              ctx.moveTo(x, y);
              ctx.lineTo(x + cellWidth, y);
            }

            // Right border
            ctx.moveTo(x + cellWidth, y);
            ctx.lineTo(x + cellWidth, y + cellHeight);

            // Bottom border
            ctx.moveTo(x, y + cellHeight);
            ctx.lineTo(x + cellWidth, y + cellHeight);

            // Left border
            if (j === 0) {
              ctx.moveTo(x, y);
              ctx.lineTo(x, y + cellHeight);
            }

            ctx.strokeStyle = "#3a3d41"; // Border color
            ctx.stroke();

            // Draw cell position
            const position = i * cols + j;
            if (position < size) {
              ctx.fillStyle = "#fff"; // Text color
              ctx.fillText(`${position}`, x + 5, y + 15); // Position text
            }
          }
        }

        // Draw data items with adjustments for first and last cells
        data.forEach(({ startingPosition, size }) => {
          let remainingSize = size;
          let currentPosition = startingPosition;

          while (remainingSize > 0) {
            const row = Math.floor(currentPosition / cols);
            const col = currentPosition % cols;
            const x = col * cellWidth;
            const y = row * cellHeight + rowMargin; // Add vertical margin
            const cellsInRow = Math.min(remainingSize, cols - col);
            const isFirstCell = currentPosition === startingPosition;
            const isLastCell =
              currentPosition + cellsInRow - 1 === startingPosition + size - 1;

            const adjustedX = x + (isFirstCell ? cellMargin : 0); // Add left margin for the first cell
            const adjustedWidth =
              cellsInRow * cellWidth -
              (isFirstCell ? cellMargin : 0) -
              (isLastCell ? cellMargin : 0); // Subtract right margin for the last cell
            const height = cellHeight - 2 * rowMargin; // Adjust height for vertical margin

            ctx.fillStyle = "rgba(0, 128, 255, 0.5)";
            ctx.fillRect(adjustedX, y, adjustedWidth, height);

            remainingSize -= cellsInRow;
            currentPosition += cellsInRow;
          }
        });
      }
    }
  }, [size, data]);

  return <canvas ref={canvasRef} />;
}

function App() {
  const [data, setData] = React.useState([
    { startingPosition: 5, size: 10 },
    { startingPosition: 20, size: 15 },
  ]);

  const handleUpdateItem = (
    index: number,
    updatedItem: { startingPosition: number; size: number }
  ) => {
    setData((prevData) =>
      prevData.map((item, i) =>
        i === index ? { ...item, ...updatedItem } : item
      )
    );
  };

  return (
    <div className="App">
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <CanvasTable size={48} data={data} onUpdateItem={handleUpdateItem} />
    </div>
  );
}

export default App;
