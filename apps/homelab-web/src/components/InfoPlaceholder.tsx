import { LuInfo } from 'react-icons/lu'
import './NodeInfo.css'

export default function InfoPlaceholder() {
  return (
    <div className="node-info">
      <div className="node-info__head">
        <span className="node-info__logo node-info__logo--info">
          <LuInfo />
        </span>
        <h2 className="node-info__title">Info</h2>
      </div>
      <p className="node-info__desc">Click on a node or action to get more info.</p>
    </div>
  )
}
