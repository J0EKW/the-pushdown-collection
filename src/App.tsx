import React, { useEffect, useReducer, useState } from 'react';
import './App.css';
import { Alphabet, Connection, State, Transition, Traversal } from './types';
import { Wrapper as TxtWrapper } from './txt/wrapper';
import { Wrapper as SimWrapper } from './sim/wrapper';
import { add as tAdd, remove as tRemove, updateState, updateInputHead, updateStack, updateInput, findDuplicateTransition, findInvalidAlphabetUse } from './lib/transitions';
import { add as sAdd, remove as sRemove, updateAccepting, updateAlternating, updateInit, updateName, updatePosition } from './lib/states';
import { Step, animate, assessSimulation } from './lib/simulation';
import { GuiWrapper } from './gui/wrapper';
import { gsap } from 'gsap';
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { OptionWrapper } from './options/Wrapper';
import DefaultOptions from './lib/DefaultOptions';
import optionsReducer from './lib/OptionsReducer';
import { OptionContext, OptionDispatchContext, AlphabetContext, AlphabetDispatchContext } from './lib/OptionsContext';
import alphabetReducer from './lib/AlphabetReducer';
import DefaultAlphabet from './lib/DefaultAlphabet';
gsap.registerPlugin(MotionPathPlugin);


function App() {
  const [options, optionsDispatch] = useReducer(optionsReducer, DefaultOptions)
  const [currentTraversal, setCurrentTraversal] = useState<Traversal[]>([])
  const [input, setInput] = useState<string>("")
  const [stacks, setStacks] = useState<string[]>(Array(2).fill(options['stackFrontChar'].value))
  const [states, setStates] = useState<State[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [scale, setScale] = useState<number>(100)
  const [pos, setPos] = useState<{x: number, y: number}>({x: 0, y: 0})
  const [interactMode, setInteractMode] = useState<number>(0)
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedTraversal, setSelectedTraversal] = useState<number>(-1)
  const [animTimeouts, setAnimTimeouts] = useState<NodeJS.Timeout[]>([])
  const [defaultTraversal, setDefaultTraversal] = useState<Traversal>({id: 0, history: [-1], stateId: 0, transitionId: -1, stack: stacks, inputHead: options['bookendInput'].value ? 1 : 0, end: 0})
  const [traversal, setTraversal] = useState<Traversal[]>([defaultTraversal])
  const [colour, setColour] = useState<string>('light')

  //const [alphabet, setAlphabet] = useState<Alphabet>({startChar:'S', endChar:'E', callChars:[], returnChars:[], internalChars:[], miscChars:['0', '1'], allChars:['S', 'E', '0', '1']})
  
  const [alphabet, alphabetDispatch] = useReducer(alphabetReducer, DefaultAlphabet)
  const stackCountMax = 2

  const arrayEqual = (a: any[], b: any[]): boolean => {
    if (a.length !== b.length) {
      return false
    }
    for (let index = 0; index < a.length; index++) {
      if (a[index] !== b[index]) {
        return false
      }
    }
    return true
  }

  const reset = () => {

    gsap.killTweensOf("*");
    currentTraversal.forEach((x, i) => {
      let ball = document.getElementById(String("travAnim" + i));
      let pulse = document.getElementById(String("animPulse" + i));
      
      ball?.remove()
      pulse?.remove()
    })

    animTimeouts.forEach((x, i) => {
      clearTimeout(x)
    })

    setCurrentTraversal([])
    setTraversal([])
  }

  const clientRemoveTransition = (transitionId: number) => {
    let newPA = tRemove(transitionId, [...transitions], [...states], [...connections])
    setTransitions(newPA.transitions)
    setStates(newPA.states)
    setConnections(newPA.connections)
  }

  const clientUpdateCInput = (transitionId: number, cInput: string) => {
    let newTransitions = updateInput(transitionId, cInput, [...transitions], options['forceDeterministic'].value, alphabet)
    setTransitions(newTransitions)
  }

  const clientUpdateCState = (transitionId: number, cStateName: string) => {
    let newPA = updateState(transitionId, cStateName, true, [...transitions], [...states], [...connections], options['forceDeterministic'].value)
    setTransitions(newPA.transitions)
    setStates(newPA.states)
    setConnections(newPA.connections)
  }

  const clientUpdateNState = (transitionId: number, cStateName: string) => {
    let newPA = updateState(transitionId, cStateName, false, [...transitions], [...states], [...connections], options['forceDeterministic'].value)
    setTransitions(newPA.transitions)
    setStates(newPA.states)
    setConnections(newPA.connections)
  }

  const clientUpdateCStack = (transitionId: number, value: string, stackIndex: number) => {
    let newTransitions = updateStack(transitionId, value, true, stackIndex, [...transitions], options['forceDeterministic'].value)
    setTransitions(newTransitions)
  }

  const clientUpdateNStack = (transitionId: number, value: string, stackIndex: number) => {
    if (options['forceVisibly'].value === false) {
      let newTransitions = updateStack(transitionId, value, false, stackIndex, [...transitions], options['forceDeterministic'].value)
      setTransitions(newTransitions)
    }
  }

  const clientUpdateInputHead = (transitionId: number, value: number) => {
    let newTransitions = updateInputHead(transitionId, value, [...transitions], options['forceDeterministic'].value)
    setTransitions(newTransitions)
  }

  const clientAddTransition = () => {
    let newPA = tAdd([...transitions], [...states], stackCountMax, [...connections])
    setTransitions(newPA.transitions)
    setStates(newPA.states)
    setConnections(newPA.connections)
  }

  const clientAddGuiTransition = (cState: State, nState: State) => {
    let newPA = tAdd([...transitions], [...states], stackCountMax, [...connections], cState.id, undefined, undefined, nState.id)

    setTransitions(newPA.transitions)
    setStates(newPA.states)
    setConnections(newPA.connections)
  }

  const clientRemoveState = (id: number) => {
    let newPA = sRemove(id, [...transitions], [...states], [...connections])
    setTransitions(newPA.transitions)
    setStates(newPA.states)
    setConnections(newPA.connections)
  }

  const clientUpdateName = (id: number, name: string) => {
    let newStates = updateName(id, name, [...states])
    setStates(newStates)
  }

  const clientUpdateInit = (id: number, value: boolean) => {
    let newStates = updateInit(id, value, [...states])
    let newInit = newStates.find(s => s.id === id)
    let dTrav = defaultTraversal
    dTrav.stateId = newInit ? newInit.id : dTrav.stateId
    setStates(newStates)
    setDefaultTraversal(dTrav)
  }

  const clientUpdateAccepting = (id: number, value: boolean) => {
    let newStates = updateAccepting(id, value, [...states])
    setStates(newStates)
  }

  const clientUpdateAlternating = (id: number, value: boolean) => {
    let newStates = updateAlternating(id, value, [...states])
    setStates(newStates)
  }

  const clientGuiUpdateStatePos = (id: number, x: number, y: number) => {
    let newStates = updatePosition(id, x, y, [...states])
    setStates(newStates)
  }

  const clientAddState = () => {
    let newStates = sAdd([...states])
    setStates(newStates)
  }

  const clientAddGuiState = (x: number, y: number) => {
    let newStates = sAdd([...states])
    newStates = updatePosition(newStates[newStates.length - 1].id, x, y, [...newStates])
    setStates(newStates)
  }

  const clientAlphabetUpdate = (id: string, char: string, index: number) => {
    let typeParam = 'update'
    if (index === -1) {
      typeParam = 'add'
    } else if (index === -2) {
      typeParam = 'empty'
    } else if (char.length === 0) {
      typeParam = 'remove'
    }
    console.log(alphabet)
    alphabetDispatch({
      type: typeParam,
      id: id,
      params: { char, index }
    })
    console.log(alphabet)
  }

  const clientSimRun = () => {
    let allTraversals: Traversal[] = []
    let currentTraversals: Traversal[] = []
    let tempTimeouts: NodeJS.Timeout[] = []
    let newTraversals = [defaultTraversal]
    let index = 0
    let duplicates : Transition[] = []
    if (options['forceVisibly'].value && findInvalidAlphabetUse(transitions)) {
      return
    }

    if (options['forceDeterministic'].value) {
      for (let x = 0; x < transitions.length; x++) {
        duplicates = [...duplicates, ...findDuplicateTransition(transitions[x], transitions)]
      }
    }
    if (duplicates.length !== 0) {
      console.log("You have set the simulation to only allow deterministic connections, and nondeterministic connections were found")
    } else if (states.length === 0 || transitions.length === 0) {
      console.log("You have no states/transitions, which are required to run the simulation")
    } else if (states.find(s => s.initial) === undefined) {
      console.log("You need to set one of the states as the Initial State for the simulation to work")
    } else {
      gsap.killTweensOf("*");
      currentTraversals.forEach((x, i) => {
        let ball = document.getElementById(String("travAnim" + i));
        let pulse = document.getElementById(String("animPulse" + i));
        
        ball?.remove()
        pulse?.remove()
      })

      while (true) {
        if (currentTraversals.length > 0) {
          newTraversals = Step([...transitions], input, [...currentTraversals], options['stackCount'].value)
        }
        if (arrayEqual(newTraversals, currentTraversals)) {
          assessSimulation(allTraversals, states)
          break
        }
        
        tempTimeouts.push(setTimeout((newTraversals: Traversal[], currentTraversals: Traversal[]) => {
          setCurrentTraversal(newTraversals)
          gsap.killTweensOf("*");
          currentTraversals.forEach((x, i) => {
            let ball = document.getElementById(String("travAnim" + i));
            let pulse = document.getElementById(String("animPulse" + i));
            
            ball?.remove()
            setTimeout(() => {
              pulse?.remove()
            }, 750 / options['animationSpeed'].value, pulse);
          })
          if (options['animationOn'].value) {
            if (selectedTraversal === -1) { 
              animate([...newTraversals], [...connections], [...states], options['haltCondition'].value, scale / 100, options['animationSpeed'].value, false)
            } else {
              let target = newTraversals.find(t => t.id === selectedTraversal)
              if (target !== undefined) {
                animate([target], [...connections], [...states], options['haltCondition'].value, scale / 100, options['animationSpeed'].value, false)
              }
            }
          }
        }, index * 1500 / options['animationSpeed'].value, newTraversals, currentTraversals))
        currentTraversals = newTraversals
        allTraversals = [...allTraversals, ...newTraversals]
        index += 1
      }
      setAnimTimeouts(tempTimeouts)
    }
  }

  const clientSimStep = () => {
    let duplicates : Transition[] = []

    if (options['forceDeterministic'].value) {
      for (let x = 0; x < transitions.length; x++) {
        duplicates = [...duplicates, ...findDuplicateTransition(transitions[x], transitions)]
      }
    }
    if (duplicates.length !== 0) {
      console.log("You have set the simulation to only allow deterministic connections, and nondeterministic connections were found")
    } else if (states.length === 0 || transitions.length === 0) {
      console.log("You have no states/transitions, which are required to run the simulation")
    } else if (states.find(s => s.initial) === undefined) {
      console.log("You need to set one of the states as the Initial State for the simulation to work")
    } else if (options['forceVisibly'].value && findInvalidAlphabetUse(transitions)) {
      console.log("You have set the simulation to be visibly pushdown, however there are characters that appear in multiple alphabets")
    
    } else {
      let newTraversals = [defaultTraversal]
      if (currentTraversal.length > 0) {
        newTraversals = Step([...transitions], input, [...currentTraversal], options['stackCount'].value)
      }

      if (arrayEqual(newTraversals, currentTraversal)) {
        assessSimulation(traversal, states)
      } else {
        setTraversal([...traversal, ...newTraversals])
      }
      setCurrentTraversal(newTraversals)
      setSelectedTraversal(-1)
  
      gsap.killTweensOf("*");
      currentTraversal.forEach((x, i) => {
        let ball = document.getElementById(String("travAnim" + i));
        let pulse = document.getElementById(String("animPulse" + i));
        
        ball?.remove()
        pulse?.remove()
      })
  
  
      if (options['animationOn'].value) {
        if (selectedTraversal === -1) { 
          animate([...newTraversals], [...connections], [...states], options['haltCondition'].value, scale / 100, options['animationSpeed'].value, true)
        } else {
          let target = newTraversals.find(t => t.id === selectedTraversal)
          if (target !== undefined) {
            animate([target], [...connections], [...states], options['haltCondition'].value, scale / 100, options['animationSpeed'].value, true)
          }
        }
      }
    }
  }

  useEffect(() => {
    gsap.killTweensOf("*");
    currentTraversal.forEach((x, i) => {
      let ball = document.getElementById(String("travAnim" + i));
      let pulse = document.getElementById(String("animPulse" + i));
      
      ball?.remove()
      pulse?.remove()
    })

    if (options['animationOn'].value) {
      if (selectedTraversal === -1) { 
        animate([...currentTraversal], [...connections], [...states], options['haltCondition'].value, scale / 100, options['animationSpeed'].value, true)
      } else {
        let target = currentTraversal.find(t => t.id === selectedTraversal)
        if (target !== undefined) {
          animate([target], [...connections], [...states], options['haltCondition'].value, scale / 100, options['animationSpeed'].value, true)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, scale, states, selectedTraversal])

  useEffect(() => {
    setStacks(Array(2).fill(options['stackFrontChar'].value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options['stackFrontChar'].value])

  useEffect(() => {
    setDefaultTraversal({
      id: defaultTraversal.id,
      history: defaultTraversal.history,
      stateId: defaultTraversal.stateId,
      transitionId: defaultTraversal.transitionId,
      stack: stacks,
      inputHead: options['bookendInput'].value ? 1 : 0,
      end: defaultTraversal.end})
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stacks, options['bookendInput'].value])

  useEffect(() => {
    let newColour = 'light'
    switch (options['colourScheme'].value) {
        case 0:
            newColour = 'light'
            break
        case 1:
            newColour = 'dark'
            break
        case 2:
            newColour = 'darkContrast'
            break
        case 3:
            newColour = 'lightContrast'
            break
        default:
            break
    }
    setColour(newColour)
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [options['colourScheme'].value])

useEffect(() => {
  if (options['enableAlternating'].value == false) {
    let newStates = states
    newStates.forEach(x => {
      if (x.alternating) {
        x.alternating = false
      }
    })
    setStates(newStates)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [options['enableAlternating'].value])

  return (
    <>
     <div id="header" className={colour + " header"}>The Pushdown Collection - v0.1.1 - <a href="https://github.com/J0EKW/the-pushdown-collection">repo</a></div>
    <div className="App">
      <OptionContext.Provider value={options} >
      <OptionDispatchContext.Provider value={optionsDispatch} >
      <GuiWrapper
          colour={colour}
          states={states}
          transitions={transitions}
          connections={connections}
          traversals={currentTraversal}
          scale={scale}
          stackCount={options['stackCount'].value}
          interactMode={interactMode}
          alphabet={alphabet}
          onStatePosUpdate={(id: number, x: number, y: number) => {clientGuiUpdateStatePos(id, x, y)}}
          onScaleUpdate={(value: number) => {setScale(value)}}
          onPosUpdate={(value: {x: number, y: number}) => setPos(value)}
          onInteractModeUpdate={(value: number) => {setInteractMode(value)}}
          onAddState={(x: number, y: number) => {clientAddGuiState(x, y)}}
          onAddTransition={(cState: State, nState: State) => {clientAddGuiTransition(cState, nState)}}
          onRemoveTransition={(id: number) => {clientRemoveTransition(id)}}
          onCInputUpdate={(id: number, value: string) => {clientUpdateCInput(id, value)}}
          onCStateUpdate={(id: number, name: string) => {clientUpdateCState(id, name)}}
          onNStateUpdate={(id: number, name: string) => {clientUpdateNState(id, name)}}
          onCStackUpdate={(id: number, value: string, index: number) => {clientUpdateCStack(id, value, index)}}
          onNStackUpdate={(id: number, value: string, index: number) => {clientUpdateNStack(id, value, index)}}
          onNInputHeadUpdate={(id: number, value: number) => {clientUpdateInputHead(id, value)}}
          onRemoveState={(id: number) => {clientRemoveState(id)}}
          onNameUpdate={(id: number, name: string) => {clientUpdateName(id, name)}}
          onInitUpdate={(id: number, value: boolean) => {clientUpdateInit(id, value)}}
          onAcceptUpdate={(id: number, value: boolean) => {clientUpdateAccepting(id, value)}}
          onAlternateUpdate={(id: number, value: boolean) => {clientUpdateAlternating(id, value)}}
          />
      <TxtWrapper
          transitions={transitions}
          states={states}
          stackCount={options['stackCount'].value}
          colour={colour}
          alphabet={alphabet}
          onRemoveTransition={(id: number) => {clientRemoveTransition(id)}}
          onCInputUpdate={(id: number, value: string) => {clientUpdateCInput(id, value)}}
          onCStateUpdate={(id: number, name: string) => {clientUpdateCState(id, name)}}
          onNStateUpdate={(id: number, name: string) => {clientUpdateNState(id, name)}}
          onCStackUpdate={(id: number, value: string, index: number) => {clientUpdateCStack(id, value, index)}}
          onNStackUpdate={(id: number, value: string, index: number) => {clientUpdateNStack(id, value, index)}}
          onNInputHeadUpdate={(id: number, value: number) => {clientUpdateInputHead(id, value)}}
          onAddTransition={() => {clientAddTransition()}}
          onRemoveState={(id: number) => {clientRemoveState(id)}}
          onNameUpdate={(id: number, name: string) => {clientUpdateName(id, name)}}
          onInitUpdate={(id: number, value: boolean) => {clientUpdateInit(id, value)}}
          onAcceptUpdate={(id: number, value: boolean) => {clientUpdateAccepting(id, value)}}
          onAlternateUpdate={(id: number, value: boolean) => {clientUpdateAlternating(id, value)}}
          onAddState={() => {clientAddState()}}
          onAlphabetUpdate={(id: string, char: string, index: number) => {clientAlphabetUpdate(id, char, index)}}/>
      <OptionWrapper
        onAlphabetUpdate={(id: string, char: string, index: number) => {clientAlphabetUpdate(id, char, index)}}
        colour={colour}
      />
      <SimWrapper
        colour={colour}
        input={input}
        stacks={stacks}
        currentTraversals={currentTraversal}
        states={states}
        haltCond={options['haltCondition'].value}
        alphabet={alphabet}
        onInputUpdate={(value: string) => {setInput(value)}}
        onRun={() => {clientSimRun()}}
        onStep={() => {clientSimStep()}}
        onReset={() => {reset()}}
        setSelected={(value: number) => {setSelectedTraversal(value)}}
      />
      </OptionDispatchContext.Provider>
      </OptionContext.Provider>
    </div>
    </>
  );
}

export default App;
