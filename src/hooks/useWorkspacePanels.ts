import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import usePersistentState from "./usePersistentState";

const MIN_SIDE_PANEL_WIDTH = 260;
const MIN_EDITOR_WIDTH = 420;
const RESIZE_HANDLE_WIDTH = 6;
const EDGE_GUTTER = 24;

function getViewportWidth() {
    return typeof window !== "undefined" ? window.innerWidth : 1280;
}

function getMaxChatWidth(currentProblemWidth: number, isProblemVisible: boolean) {
    const reservedProblem = isProblemVisible ? currentProblemWidth + RESIZE_HANDLE_WIDTH : 0;
    const reservedHandles = RESIZE_HANDLE_WIDTH;
    const max = getViewportWidth() - MIN_EDITOR_WIDTH - reservedProblem - reservedHandles - EDGE_GUTTER;
    return Math.max(MIN_SIDE_PANEL_WIDTH, max);
}

function getMaxProblemWidth(currentChatWidth: number, isChatVisible: boolean) {
    const reservedChat = isChatVisible ? currentChatWidth + RESIZE_HANDLE_WIDTH : 0;
    const reservedHandles = RESIZE_HANDLE_WIDTH;
    const max = getViewportWidth() - MIN_EDITOR_WIDTH - reservedChat - reservedHandles - EDGE_GUTTER;
    return Math.max(MIN_SIDE_PANEL_WIDTH, max);
}

export default function useWorkspacePanels() {
    const [chatVisible, setChatVisible] = usePersistentState<boolean>("chat_panel_visible", true);
    const [problemVisible, setProblemVisible] = usePersistentState<boolean>("problem_panel_visible", true);
    const [problemWidth, setProblemWidth] = usePersistentState<number>("problem_panel_width", 360, {
        validate: (value) => Number.isInteger(value) && value >= 260 && value <= 560,
    });
    const [chatWidth, setChatWidth] = usePersistentState<number>("chat_panel_width", 380, {
        validate: (value) => Number.isInteger(value) && value >= 260 && value <= getViewportWidth() - 300,
    });

    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);
    const isProblemDragging = useRef(false);
    const problemDragStartX = useRef(0);
    const problemDragStartWidth = useRef(0);
    const chatWidthRef = useRef(chatWidth);
    const problemWidthRef = useRef(problemWidth);
    const chatVisibleRef = useRef(chatVisible);
    const problemVisibleRef = useRef(problemVisible);

    const handleChatResizeMouseDown = useCallback((e: ReactMouseEvent) => {
        isDragging.current = true;
        dragStartX.current = e.clientX;
        dragStartWidth.current = chatWidth;
        e.preventDefault();
    }, [chatWidth]);

    const handleProblemResizeMouseDown = useCallback((e: ReactMouseEvent) => {
        isProblemDragging.current = true;
        problemDragStartX.current = e.clientX;
        problemDragStartWidth.current = problemWidth;
        e.preventDefault();
    }, [problemWidth]);

    useEffect(() => {
        chatWidthRef.current = chatWidth;
        problemWidthRef.current = problemWidth;
        chatVisibleRef.current = chatVisible;
        problemVisibleRef.current = problemVisible;
    }, [chatWidth, problemWidth, chatVisible, problemVisible]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isDragging.current) {
                const delta = e.clientX - dragStartX.current;
                const proposed = dragStartWidth.current + delta;
                const maxWidth = getMaxChatWidth(problemWidthRef.current, problemVisibleRef.current);
                const newWidth = Math.max(MIN_SIDE_PANEL_WIDTH, Math.min(proposed, maxWidth));
                setChatWidth(newWidth);
            }

            if (isProblemDragging.current) {
                const problemDelta = problemDragStartX.current - e.clientX;
                const proposed = problemDragStartWidth.current + problemDelta;
                const maxWidth = getMaxProblemWidth(chatWidthRef.current, chatVisibleRef.current);
                const newProblemWidth = Math.max(MIN_SIDE_PANEL_WIDTH, Math.min(proposed, maxWidth));
                setProblemWidth(newProblemWidth);
            }
        };

        const onMouseUp = () => {
            isDragging.current = false;
            isProblemDragging.current = false;
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);

        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, [setChatWidth, setProblemWidth]);

    useEffect(() => {
        const onResize = () => {
            const chatMax = getMaxChatWidth(problemWidthRef.current, problemVisibleRef.current);
            const problemMax = getMaxProblemWidth(chatWidthRef.current, chatVisibleRef.current);

            if (chatWidthRef.current > chatMax) {
                setChatWidth(chatMax);
            }

            if (problemWidthRef.current > problemMax) {
                setProblemWidth(problemMax);
            }
        };

        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [setChatWidth, setProblemWidth]);

    return {
        chatVisible,
        setChatVisible,
        problemVisible,
        setProblemVisible,
        chatWidth,
        problemWidth,
        handleChatResizeMouseDown,
        handleProblemResizeMouseDown,
    };
}
