const { createStore } = require('zustand/vanilla');

const useStore = createStore((set, get) => {
  const interceptSet = (...args) => {
    set(...args);
    console.log("State inside interceptSet after set:", get().tasks.length);
  };

  return {
    tasks: [{sno: 1}, {sno: 2}],
    deleteTask: (sno) => interceptSet((state) => ({
      tasks: state.tasks.filter(t => t.sno !== sno)
    }))
  };
});

console.log("Initial:", useStore.getState().tasks.length);
useStore.getState().deleteTask(1);
console.log("Final:", useStore.getState().tasks.length);
