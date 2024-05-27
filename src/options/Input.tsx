import { useContext, useEffect, useState } from "react"
import '../App.css';
import { OptionContext, OptionDispatchContext } from "../lib/OptionsContext";

type InputProps = {
    colour: String
}

export const Input = (props: InputProps) => {
    const [collapse, setCollapse] = useState<boolean>(true)
    const [render, setRender] = useState<boolean>(false)
    const [to, setTo] = useState<NodeJS.Timeout>()
    const options = useContext(OptionContext)
    const dispatch = useContext(OptionDispatchContext)

    const [fChar, setFChar] = useState<string>(options['inputFrontChar'].value)
    const [eChar, setEChar] = useState<string>(options['inputEndChar'].value)

    const updateVisiblity = () => {
        if (!collapse) {
            document.getElementById('inputOptionList')?.setAttribute('class', props.colour + ' options close')
            setTo(setTimeout(() => {
                setRender(false)
            }, 690))
        } else {
            setRender(true)
            clearTimeout(to)
            setTimeout(() => {
                document.getElementById('inputOptionList')?.setAttribute('class', props.colour + ' options')
            }, 1)
        }
        setCollapse(!collapse)
    }

    const handleInputFrontChar = (e: any) => {
        if (e.key === 'Enter') {
          
            dispatch({
                type: 'set',
                id: 'inputFrontChar',
                value: fChar
            })
        }
    }

    const handleInputEndChar = (e: any) => {
        if (e.key === 'Enter') {
            dispatch({
                type: 'set',
                id: 'inputEndChar',
                value: eChar
            })
        }
    }

    const handleBookendInput = () => {
        dispatch({
            type: 'set',
            id: 'bookendInput',
            value: !options['bookendInput'].value
        })
    }

    return (
        <div id='inputOptionWrapper'>
            <h1 className={props.colour + ' optionHeader'} onClick={() => {updateVisiblity()}}>{'Input' + (collapse ? ' ▼' : ' ▲')}</h1>
            {render && 
            <div id='inputOptionList' className={props.colour + ' options close'}>
                <div id='bookendWrapper'>
                    Bookend Input <input type='checkbox' checked={options['bookendInput'].value} onClick={handleBookendInput} />
                </div>
                <div id='frontCharWrapper'>
                    Front Char <input className={props.colour + ' optionsBoxInput'} type='text' max={1} value={fChar} onChange={(x) => {setFChar(x.currentTarget.value)}} onKeyDown={(e) => handleInputFrontChar(e)}/>
                </div>
                <div id='endCharWrapper'>
                    End Char <input className={props.colour + ' optionsBoxInput'} type='text' max={1} value={eChar} onChange={(x) => {setEChar(x.currentTarget.value)}} onKeyDown={(e) => handleInputEndChar(e)}/>
                </div>
            </div>}
        </div>
    )
}