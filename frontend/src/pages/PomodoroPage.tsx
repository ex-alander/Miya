import React, { useState, useEffect, useRef } from "react";
import "./PomodoroPage.css";

interface Timer {
  id: string;
  work: number;          // в секундах
  shortBreak: number;    // в секундах
  longBreak: number;     // в секундах
  currentValue: number;  // текущее значение в секундах для отображения
  state: "idle" | "running" | "paused";
  phase: "work" | "shortBreak" | "longBreak";
  workCount: number;
  position: number;      // -1, 0, 1 для распределения
}

interface EditState {
  timerId: string;
  type: "work" | "shortBreak" | "longBreak";
  value: string;         // в формате "MM:SS"
  part: "minutes" | "seconds"; // текущая редактируемая часть
  originalValue: string; // исходное значение для сохранения при отмене
}

const DOUBLE_CLICK_DELAY = 300;

export default function PomodoroPage() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const intervalsRef = useRef<{ [key: string]: ReturnType<typeof setInterval> }>({});
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickRef = useRef<{ timerId: string; time: number; isRight: boolean } | null>(null);
  const editStateRef = useRef(editState);

  // Синхронизация ref с актуальным editState
  useEffect(() => {
    editStateRef.current = editState;
  }, [editState]);

  // Глобальный обработчик кликов для автоматического сохранения
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!editState) return;
      
      const target = e.target as HTMLElement;
      const isEditingElement = target.closest('.editing');
      
      // Если клик был не по редактируемому элементу - сохраняем
      if (!isEditingElement) {
        finishEditing();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editState]);

  // Обработчик колесика мыши
  useEffect(() => {
    if (!editState) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();

      const currentEdit = editStateRef.current;
      if (!currentEdit) return;

      const delta = e.deltaY > 0 ? -1 : 1;
      const [minsStr, secsStr] = currentEdit.value.split(':');
      let mins = parseInt(minsStr, 10);
      let secs = parseInt(secsStr, 10);

      // Определяем, какая часть редактируется (минуты или секунды)
      if (currentEdit.part === "minutes") {
        // Циклическое изменение минут: 59 -> 0, 0 -> 59 при прокрутке вниз
        if (delta > 0) {
          // Прокрутка вверх (увеличение)
          mins = mins >= 59 ? 0 : mins + 1;
        } else {
          // Прокрутка вниз (уменьшение)
          mins = mins <= 0 ? 59 : mins - 1;
        }
      } else {
        // Для секунд: шаг 5, циклически от 0 до 60
        if (delta > 0) {
          // Прокрутка вверх (увеличение)
          if (secs >= 55) {
            secs = 0;
          } else {
            secs = Math.ceil((secs + 1) / 5) * 5;
          }
        } else {
          // Прокрутка вниз (уменьшение)
          if (secs <= 0) {
            secs = 55;
          } else {
            secs = Math.floor((secs - 1) / 5) * 5;
          }
        }
        
        secs = Math.min(60, Math.max(0, secs));
      }

      setEditState({
        ...currentEdit,
        value: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      });
    };

    window.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      window.removeEventListener('wheel', wheelHandler);
    };
  }, [editState]);

  
  // Отслеживание наведения мыши для определения части редактирования
  useEffect(() => {
    if (!editState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const editingElement = target.closest('.editing');
      
      if (!editingElement) return;

      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        const position = range.startOffset;
        if (position <= 1) {
          setEditState(prev => prev ? { ...prev, part: "minutes" } : null);
        } else if (position >= 3) {
          setEditState(prev => prev ? { ...prev, part: "seconds" } : null);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [editState]);

  // Очистка интервалов при размонтировании
  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  // Создание нового таймера
  const createTimer = (position: number): Timer => ({
    id: crypto.randomUUID(),
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    currentValue: 25 * 60,
    state: "idle",
    phase: "work",
    workCount: 0,
    position
  });

  // Сортировка по позиции
  const sortTimersByPosition = (timers: Timer[]) =>
    [...timers].sort((a, b) => a.position - b.position);

  // Добавление таймера в правильную позицию
  const addTimer = (clickX: number, containerRect: DOMRect) => {
    if (timers.length >= 3) return;
    if (editState) finishEditing();

    if (timers.length === 0) {
      setTimers([createTimer(0)]);
      return;
    }

    const relativeX = (clickX - containerRect.left) / containerRect.width;
    const sortedTimers = sortTimersByPosition(timers);
    
    let newPosition: number;

    if (timers.length === 1) {
      const timerElement = document.querySelector(`#timer-${sortedTimers[0].id}`);
      if (timerElement) {
        const timerRect = timerElement.getBoundingClientRect();
        const timerCenter = ((timerRect.left + timerRect.width / 2) - containerRect.left) / containerRect.width;
        newPosition = relativeX < timerCenter ? -1 : 1;
      } else {
        newPosition = relativeX < 0.5 ? -1 : 1;
      }
    } else {
      const timer1Element = document.querySelector(`#timer-${sortedTimers[0].id}`);
      const timer2Element = document.querySelector(`#timer-${sortedTimers[1].id}`);
      
      if (timer1Element && timer2Element) {
        const timer1Rect = timer1Element.getBoundingClientRect();
        const timer2Rect = timer2Element.getBoundingClientRect();
        
        const timer1Center = ((timer1Rect.left + timer1Rect.width / 2) - containerRect.left) / containerRect.width;
        const timer2Center = ((timer2Rect.left + timer2Rect.width / 2) - containerRect.left) / containerRect.width;
        
        if (relativeX < timer1Center) {
          newPosition = -1;
        } else if (relativeX > timer2Center) {
          newPosition = 1;
        } else {
          newPosition = 0;
        }
      } else {
        if (relativeX < 0.33) {
          newPosition = -1;
        } else if (relativeX > 0.66) {
          newPosition = 1;
        } else {
          newPosition = 0;
        }
      }
    }

    const newTimer = createTimer(newPosition);
    const newTimers = [...timers, newTimer];
    setTimers(newTimers);
  };

  // Запуск / пауза
  const toggleTimer = (timerId: string) => {
    if (editState) finishEditing();

    setTimers((prev) => {
      const timer = prev.find((t) => t.id === timerId);
      if (!timer) return prev;

      if (timer.state === "idle" || timer.state === "paused") {
        // Останавливаем предыдущий активный таймер
        if (activeTimerId && activeTimerId !== timerId) {
          setTimers((prevTimers) =>
            prevTimers.map((t) =>
              t.id === activeTimerId ? { ...t, state: "paused" } : t
            )
          );
          if (intervalsRef.current[activeTimerId]) {
            clearInterval(intervalsRef.current[activeTimerId]);
            delete intervalsRef.current[activeTimerId];
          }
        }

        setActiveTimerId(timerId);
        if (intervalsRef.current[timerId]) {
          clearInterval(intervalsRef.current[timerId]);
        }

        intervalsRef.current[timerId] = setInterval(() => {
          setTimers((current) => {
            const currentTimer = current.find((t) => t.id === timerId);
            if (!currentTimer) return current;

            const newValue = currentTimer.currentValue - 1;
            if (newValue <= 0) {
              handlePhaseTransition(timerId, currentTimer);
              return current;
            }

            return current.map((t) =>
              t.id === timerId ? { ...t, currentValue: newValue } : t
            );
          });
        }, 1000);

        return prev.map((t) =>
          t.id === timerId ? { ...t, state: "running" } : t
        );
      } else if (timer.state === "running") {
        if (intervalsRef.current[timerId]) {
          clearInterval(intervalsRef.current[timerId]);
          delete intervalsRef.current[timerId];
        }
        setActiveTimerId(null);
        return prev.map((t) =>
          t.id === timerId ? { ...t, state: "paused" } : t
        );
      }

      return prev;
    });
  };

  // Обработка правого клика
  const handleRightClick = (timerId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const lastClick = lastClickRef.current;

    if (
      lastClick &&
      lastClick.timerId === timerId &&
      lastClick.isRight &&
      now - lastClick.time < DOUBLE_CLICK_DELAY
    ) {
      // Двойной правый клик – удаление
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;

      if (intervalsRef.current[timerId]) {
        clearInterval(intervalsRef.current[timerId]);
        delete intervalsRef.current[timerId];
      }
      if (activeTimerId === timerId) {
        setActiveTimerId(null);
      }

      const element = document.getElementById(`timer-${timerId}`);
      if (element) {
        element.classList.add("timer-disappear");
        element.addEventListener(
          "animationend",
          () => {
            setTimers((prev) => {
              const filtered = prev.filter((t) => t.id !== timerId);
              if (filtered.length === 0) {
                setEditState(null);
                return [];
              }
              return filtered;
            });
          },
          { once: true }
        );
      } else {
        setTimers((prev) => {
          const filtered = prev.filter((t) => t.id !== timerId);
          if (filtered.length === 0) {
            setEditState(null);
            return [];
          }
          return filtered;
        });
      }

      lastClickRef.current = null;
    } else {
      // Одинарный правый клик – сброс
      lastClickRef.current = { timerId, time: now, isRight: true };

      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => {
        if (intervalsRef.current[timerId]) {
          clearInterval(intervalsRef.current[timerId]);
          delete intervalsRef.current[timerId];
        }

        setTimers((prev) =>
          prev.map((t) =>
            t.id === timerId
              ? {
                  ...t,
                  currentValue: t.work,
                  state: "idle",
                  phase: "work",
                  workCount: 0,
                }
              : t
          )
        );

        if (activeTimerId === timerId) setActiveTimerId(null);
        lastClickRef.current = null;
        clickTimerRef.current = null;
      }, DOUBLE_CLICK_DELAY);
    }
  };

  // Создаём ссылку на звук (можно вынести за пределы компонента, чтобы не пересоздавать)
const workEndSound = new Audio('/sounds/fires4.mp3');
const shortBreakEndSound = new Audio('/sounds/fires2.mp3');
const longBreakEndSound = new Audio('/sounds/fires3.mp3');

// Функция воспроизведения
const playTimerEndSound = (phase: 'work' | 'shortBreak' | 'longBreak') => {
  let sound;
  if (phase === 'work') sound = workEndSound;
  else if (phase === 'shortBreak') sound = shortBreakEndSound;
  else sound = longBreakEndSound;
  sound.currentTime = 0;
  sound.play().catch(e => console.log(e));
};

  // Переход между фазами
  const handlePhaseTransition = (timerId: string, timer: Timer) => {
    playTimerEndSound(timer.phase);
    let nextPhase: "work" | "shortBreak" | "longBreak";
    let nextValue: number;
    let nextWorkCount = timer.workCount;

    if (timer.phase === "work") {
      nextWorkCount = timer.workCount + 1;
      if (nextWorkCount % 4 === 0) {
        nextPhase = "longBreak";
        nextValue = timer.longBreak;
      } else {
        nextPhase = "shortBreak";
        nextValue = timer.shortBreak;
      }
    } else {
      nextPhase = "work";
      nextValue = timer.work;
    }

    setTimers((prev) =>
      prev.map((t) =>
        t.id === timerId
          ? {
              ...t,
              phase: nextPhase,
              currentValue: nextValue,
              workCount: nextWorkCount,
              state: "running"
            }
          : t
      )
    );
  };

  // Форматирование времени
  const formatTime = (seconds: number, showSeconds: boolean): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (showSeconds) {
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return mins.toString();
  };

  // Вход в режим редактирования
  const startEditing = (
    timerId: string,
    type: "work" | "shortBreak" | "longBreak",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const timer = timers.find((t) => t.id === timerId);
    if (!timer) return;

    let totalSeconds: number;
    switch (type) {
      case "work":
        totalSeconds = timer.work;
        break;
      case "shortBreak":
        totalSeconds = timer.shortBreak;
        break;
      case "longBreak":
        totalSeconds = timer.longBreak;
        break;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const value = `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;

    setEditState({
      timerId,
      type,
      value,
      part: "minutes",
      originalValue: value,
    });
  };

  // Завершение редактирования
  const finishEditing = () => {
    if (!editState) return;

    const { timerId, type, value } = editState;
    const [minsStr, secsStr] = value.split(":");
    const minutes = parseInt(minsStr, 10);
    const seconds = parseInt(secsStr, 10);
    
    const roundedSeconds = Math.round(seconds / 5) * 5;
    const totalSeconds = minutes * 60 + roundedSeconds;

    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== timerId) return t;

        const updates: Partial<Timer> = {};
        switch (type) {
          case "work":
            updates.work = totalSeconds;
            if (t.phase === "work") updates.currentValue = totalSeconds;
            break;
          case "shortBreak":
            updates.shortBreak = totalSeconds;
            if (t.phase === "shortBreak") updates.currentValue = totalSeconds;
            break;
          case "longBreak":
            updates.longBreak = totalSeconds;
            if (t.phase === "longBreak") updates.currentValue = totalSeconds;
            break;
        }
        return { ...t, ...updates };
      })
    );

    setEditState(null);
  };

  // Обработка клавиш
  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!editState) return;

    if (e.key === "Escape") {
      setEditState(null);
    } else if (e.key === "Enter") {
      finishEditing();
    }
  };

  // Получение отображаемого значения
  const getDisplayValue = (
    timer: Timer,
    type: "work" | "shortBreak" | "longBreak"
  ) => {
    if (editState?.timerId === timer.id && editState.type === type) {
      return editState.value;
    }
    
    const showSeconds = timer.state !== "idle" && timer.phase === type;

    if (type === "work") {
      return formatTime(
        timer.phase === "work" ? timer.currentValue : timer.work,
        showSeconds
      );
    } else {
      const value =
        timer.phase === type
          ? timer.currentValue
          : type === "shortBreak"
          ? timer.shortBreak
          : timer.longBreak;
      return formatTime(value, showSeconds);
    }
  };

  // Определение, активна ли фаза для подсветки
  const isPhaseActive = (timer: Timer, type: "work" | "shortBreak" | "longBreak"): boolean => {
  return timer.state === "running" && timer.phase === type;
  };

  // Клик по пустой области
  const handleContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".pomodoro-timer")) return;
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    addTimer(e.clientX, rect);
  };

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "48px" }}>
      <div className="animate-fade-in" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2.25rem", marginBottom: "8px" }}>Focus</h1>
        <p style={{ color: "rgba(255, 255, 255, 0.72)", marginBottom: "24px" }}>
          Pomodoro timers with fire nation spirit. Click to start, double-click to edit.
        </p>

        <div
          className="pomodoro-container"
          onClick={handleContainerClick}
          onContextMenu={(e) => e.preventDefault()}
        >
          {timers.length === 0 ? (
            <div className="pomodoro-empty-state" onClick={handleContainerClick}>
              <p>Click anywhere to create your first timer</p>
              <small>Left click to start/pause • Right click to reset • Double right click to remove</small>
            </div>
          ) : (
            <div className="pomodoro-grid">
              {sortTimersByPosition(timers).map((timer) => (
                <div
                  id={`timer-${timer.id}`}
                  key={timer.id}
                  className={`pomodoro-timer ${
                    activeTimerId === timer.id ? "active" : ""
                  } timer-appear`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTimer(timer.id);
                  }}
                  onContextMenu={(e) => handleRightClick(timer.id, e)}
                >
                  <div className="pomodoro-numbers">
                    <div
                      className={`pomodoro-main-time ${
                        timer.state !== "idle" && timer.phase === "work" ? "with-seconds" : ""
                      } ${
                        isPhaseActive(timer, "work") ? "phase-active" : ""
                      } ${
                        editState?.timerId === timer.id && editState.type === "work"
                          ? "editing"
                          : ""
                      }`}
                      onDoubleClick={(e) => startEditing(timer.id, "work", e)}
                      onKeyDown={handleKeyDown}
                      tabIndex={
                        editState?.timerId === timer.id && editState.type === "work"
                          ? 0
                          : -1
                      }
                    >
                      {getDisplayValue(timer, "work")}
                    </div>

                    <div
                      className={`pomodoro-breaks ${
                        editState?.timerId === timer.id && editState.type === "shortBreak"
                          ? "editing-short"
                          : ""
                      } ${
                        editState?.timerId === timer.id && editState.type === "longBreak"
                          ? "editing-long"
                          : ""
                      }`}
                    >
                      <span
                        className={`pomodoro-break-time ${
                          timer.state !== "idle" && timer.phase === "shortBreak" ? "with-seconds" : ""
                        } ${
                          isPhaseActive(timer, "shortBreak") ? "phase-active" : ""
                        } ${
                          editState?.timerId === timer.id && editState.type === "shortBreak"
                            ? "editing"
                            : ""
                        }`}
                        onDoubleClick={(e) => startEditing(timer.id, "shortBreak", e)}
                        onKeyDown={handleKeyDown}
                        tabIndex={
                          editState?.timerId === timer.id && editState.type === "shortBreak"
                            ? 0
                            : -1
                        }
                      >
                        {getDisplayValue(timer, "shortBreak")}
                      </span>
                      <span className="pomodoro-break-separator">|</span>
                      <span
                        className={`pomodoro-break-time ${
                          timer.state !== "idle" && timer.phase === "longBreak" ? "with-seconds" : ""
                        } ${
                          isPhaseActive(timer, "longBreak") ? "phase-active" : ""
                        } ${
                          editState?.timerId === timer.id && editState.type === "longBreak"
                            ? "editing"
                            : ""
                        }`}
                        onDoubleClick={(e) => startEditing(timer.id, "longBreak", e)}
                        onKeyDown={handleKeyDown}
                        tabIndex={
                          editState?.timerId === timer.id && editState.type === "longBreak"
                            ? 0
                            : -1
                        }
                      >
                        {getDisplayValue(timer, "longBreak")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}