import { ipcRenderer } from 'electron'
import { register as registerTxStatusListener, unregister as unregisterTxStatusListener } from 'listeners/renderer/tx-status'
import IndexerRPC from 'services/indexer/indexer-rpc'

import { switchNetwork as syncSwitchNetwork } from './sync'
import { switchNetwork as indexerSwitchNetwork } from './indexer'
import DatabaseInitSubject, { DatabaseInitParams } from 'models/subjects/database-init-subject'
import CommonUtils from 'utils/common'

const testIndexer = async (url: string): Promise<boolean> => {
  const indexerRPC = new IndexerRPC(url)
  try {
    await CommonUtils.retry(3, 100, () => {
      return indexerRPC.getLockHashIndexStates()
    })
    return true
  } catch {
    return false
  }
}

const run = async () => {
  DatabaseInitSubject.getSubject().subscribe(async (params: DatabaseInitParams) => {
    const { network, genesisBlockHash, chain } = params
    if (network && (genesisBlockHash.startsWith('0x') || genesisBlockHash === 'stop')) {
      const indexerEnabled = await testIndexer(network.remote)
      if (indexerEnabled) {
        await indexerSwitchNetwork(network.remote, genesisBlockHash, chain)
      } else {
        await syncSwitchNetwork(network.remote, genesisBlockHash, chain)
      }
    }
  })
  registerTxStatusListener()
}

ipcRenderer.on('sync-window-will-close', () => {
  unregisterTxStatusListener()
})

run()
