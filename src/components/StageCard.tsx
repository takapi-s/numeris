import React from 'react';
import "../css/StageCard.css"
import { Card } from './CardButton';

type StageCardProps = {
    card: Card | null;
};

const StageCard: React.FC<StageCardProps> = ({ card }) => {
    if (!card) {
        return <div className="stage-card empty-card">No Card</div>;
    }

    return (

        <div className={`card-container ${card?.color || ''} ${card?.ability?.name || ''}`}>
            <div className="card-details">
                {/* <span className="card-value">{card.number}</span> */}
                <img src={`${process.env.PUBLIC_URL}/numbers/${card.number}.png`} className='card-value'/>
                <img src={`${process.env.PUBLIC_URL}/ability_icon/${card.ability?.name}.png`} alt={`Card image for ${card.number}`} className="card-graphic" />
            </div>
        </div>


    );
};

export default StageCard;
