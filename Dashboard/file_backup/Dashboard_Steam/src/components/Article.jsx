/* eslint-disable react/prop-types */
import { useContext } from "react";
import { GlobalContext } from "../context";
const ArticleStatus = ({ isNew }) => {
    return isNew && <span>---- Baru Banget!!</span>;
}
const NewArticle = () =>{
    return <span>--------Baru Loh</span>
}
function Article(props) {
    const user = useContext(GlobalContext);
    return (
        <>
            <h3>{props.title}</h3>
            <small>
                Date : {props.date}, tags : {props.tags.join(", ")}{" "},
                {props.isNew && <NewArticle/>}
                <ArticleStatus isNew={props.isNew} />
            </small>
            <div>
                <small>Ditulis Oleh {user.username}</small>
            </div>
        </>
    );
}

export default Article;