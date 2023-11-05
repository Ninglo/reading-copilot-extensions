console.log('Hello, I\'m popup script!')

const API_KEY = '<YOUR_TOKEN>'

function makePrompt(text: string): string {
    return `I am a B1 level English reader,
please help me analyze the words or phrases in the following paragraph that I may not understand and translate these phrases into Chinese.
The result should include: source content, origin language, target language, translate result.
\`\`\`
${text}
\`\`\``
}

type ChatResponse = {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Choice[];
    usage: Usage;
}
type Choice = {
    index: number;
    message: Message;
    finish_reason: string;
}
type Message = {
    role: string;
    content: string;
}
type Usage = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

async function findDifficultWords(text: string, cb: (data: { result: string }) => void) {
    const match = text.match(/(.{1,3200})/g);
    if (!match) {
        return
    }
    let arr = Array.from(match)
    arr = arr.length > 5 ? arr.slice(0, 5) : arr
    console.log(`Array length is ${arr.length}`)

    for (const text of arr) {
        const result = await doFindDifficultWords(text).catch(e => {
            dispatchToActiveTab({
                type: 'error',
                data: e,
            })
            return String(e)
        })
        cb({ result })
    }

    return
}

async function doFindDifficultWords(text: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: new Headers({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
        }),
        body: JSON.stringify({
            "model": "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "user",
                    "content": `${makePrompt(text)}`
                }
            ],
        }),
    })

    const json: ChatResponse = await res.json()
    return json.choices[0]?.message.content ?? '';
}

const enum Status {
    Loading = 'Loading',
    Finish = 'Finish',
    Error = 'Error',
}
function setTitle(status: Status) {
    const title = document.getElementById('title')
    if (!title) { return }
    title.innerText = status
}

function setContent(text: string) {
    const content = document.getElementById('content')
    if (!content) { return }
    for (const sentence of text.split('\n')) {
        const p = document.createElement('p')
        p.innerText = sentence
        content.appendChild(p)
    }
}

async function dispatchToActiveTab(message: Record<string, unknown>) {
    const activeTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0]
    const id = activeTab?.id
    if (!id) {
        return
    }

    browser.tabs.sendMessage(id, message)
}

async function main() {
    browser.runtime.onMessage.addListener(async (message) => {
        console.log('popup receive message:')
        console.log(message)

        if (message.type === 'page-innerText') {
            setTitle(Status.Loading)

            await findDifficultWords(message.data, ({ result }) => {
                setContent(result)
                dispatchToActiveTab({
                    type: 'get-copilot-result',
                    data: result,
                })
            })
            setTitle(Status.Finish)
        }
    })

    dispatchToActiveTab({
        type: 'from-background',
        data: 'Hello from background!',
    })

    dispatchToActiveTab({
        type: 'get-page-innerText',
        data: 'Hello from background!',
    })
}

main()
