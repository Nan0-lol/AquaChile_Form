import {Link} from 'react-router-dom'

function LoginPage() {
    return(
        <main>
            <h3>Login</h3>
            <Link to="/home">Ir al dashboard</Link> 
        </main> 
    );
}

export default LoginPage;