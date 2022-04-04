import prompt from 'prompt';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

type Response = {
  data: {
    result: {
      from: string;
      input: string;
    }[]
  }
}

type Hash = {
  [key: string]: {
    address: string,
    name: string,
  }
}

type Transaction = {
  from: string;
  input: string;
  to: string;
}

type Send = {
  name: string;
  address: string;
  amount: string;
}

;(async function () {
  prompt.start()
  const formAnswersPath = path.resolve(__dirname, './FormAnswers.csv');
  const formAnswers = await getCSV(formAnswersPath);
  const emailHash = formAnswers.reduce((hash, answer) => {
    hash[answer[1]] = {
      address: answer[3],
      name: answer[2],
    }
    return hash;
  }, {} as Hash);
  const registrationAnswersPath = path.resolve(__dirname, './Registrations.csv');
  const regAnswers = await getCSV(registrationAnswersPath);
  const addressHash = regAnswers.reduce((addressHash, item) => {
    const entry = emailHash[item[2]]
    if (!entry) return addressHash;
    addressHash[entry.address] = {
      name: entry.name,
    }
    return addressHash;

  }, {} as { [key: string]: { name: string } })




  console.log(addressHash);

  const contractAddress = "https://explorer.celo.org/token/0xab12cd14e43dbc5f7f3f5571b449bffa14f444cc";
  const tokenOwners : string[] = await getOwners(contractAddress);

  const sendList = tokenOwners.reduce((sendList, owner) => {
    const sendTo = addressHash[owner]
    if (!sendTo) return sendList;
    sendList.push({ name: sendTo.name, address: owner, amount: '15'})
    return sendList;
  }, [] as Send[]);


  //sendList to csv



})().catch(e => console.error('There was an uncaught error: ', e));

async function getOwners(
  contractAddress = '0xaB12Cd14E43dbc5F7F3f5571B449BFfa14F444cC',
  fromToken = null
) {
  let url = `https://explorer.celo.org/token/${contractAddress}/inventory?type=JSON`
  if (fromToken) {
    url += `&unique_token=${fromToken}`
  }

  const results = (await axios.get(url)).data.result

  const owners = results.items.map((y: string) => {
    const match = y.match(/data-address-hash="(.+?)"/)
    if (!match) return null

    return match[1]
  })

  if (results.next_page_path) {
    const nextTokenPage = results.next_page_path.match(/unique_token=(\d+)/)[1]
    owners.push(...(await getOwners(contractAddress, nextTokenPage)))
  }

  return [...new Set(owners)] as string[]
}

async function getCSV(path: string) {
  return (await fs.promises.readFile(path)).toString().split(/\r?\n/).map(item => item.split(',')).slice(1)
}
